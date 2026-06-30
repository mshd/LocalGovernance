import { getDb, isDbAvailable, SOURCE_DB_PATH } from "./db";
import { instansiForSlug, slugForInstansi } from "./region-slugs";
import { loadSheetCoordinates } from "./sheet-coordinates";
import type {
  MapSpendingPoint,
  RegionExport,
  SpendingGeoJSON,
  SpendingIndex,
  SpendingItem,
} from "./spending-types";

const SQLITE_BATCH_SIZE = 500;

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function requireDb() {
  if (!isDbAvailable()) {
    throw new Error(`SQLite database not found at ${SOURCE_DB_PATH}`);
  }
  return getDb();
}

function rowToSpendingItem(
  row: Record<string, unknown>,
  rank: number,
): SpendingItem {
  return {
    id: row.id as number,
    kode_paket: row.kode_paket as string,
    rup_id: row.rup_id as string,
    agency_id: row.agency_id as string,
    work_unit_id: row.work_unit_id as number | null,
    year: row.year as number,
    transaction_source: row.transaction_source as string,
    funding_source_mask: row.funding_source_mask as number,
    company_id: row.company_id as string | null,
    vendor_name: row.vendor_name as string | null,
    procurement_method: row.procurement_method as string,
    procurement_type: row.procurement_type as string | null,
    package_name: row.package_name as string | null,
    package_name_en: row.package_name_en as string | null,
    status: row.status as string | null,
    total_value: row.total_value as string,
    domestic_value: row.domestic_value as string,
    instansi_name: row.instansi_name as string,
    satker_name: row.satker_name as string | null,
    rank,
    total_value_num: Number(row.total_value),
    score: null,
    show: false,
  };
}

function queryRealisasiByIds(
  ids: number[],
  instansiName?: string,
): Array<Record<string, unknown> & { rank: number }> {
  if (ids.length === 0) return [];

  const db = requireDb();
  const rows: Array<Record<string, unknown> & { rank: number }> = [];

  for (let i = 0; i < ids.length; i += SQLITE_BATCH_SIZE) {
    const batch = ids.slice(i, i + SQLITE_BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(", ");
    const bindings: Array<string | number> = [...batch];

    let instansiClause = "";
    if (instansiName) {
      instansiClause = "AND instansi_name = ?";
      bindings.push(instansiName);
    }

    const batchRows = db
      .query(
        `WITH ranked AS (
           SELECT *,
             ROW_NUMBER() OVER (
               PARTITION BY instansi_name
               ORDER BY CAST(total_value AS REAL) DESC
             ) AS rank
           FROM realisasi
           WHERE id IN (${placeholders})
         )
         SELECT * FROM ranked
         WHERE 1=1 ${instansiClause}`,
      )
      .all(...bindings) as Array<Record<string, unknown> & { rank: number }>;

    rows.push(...batchRows);
  }

  return rows;
}

export function loadSpendingIndex(): SpendingIndex {
  const db = requireDb();

  const regionRows = db
    .query(
      `SELECT instansi_name,
              COUNT(*) AS total_rows,
              MAX(CAST(total_value AS REAL)) AS top_value
       FROM realisasi
       GROUP BY instansi_name
       ORDER BY instansi_name`,
    )
    .all() as Array<{
    instansi_name: string;
    total_rows: number;
    top_value: number;
  }>;

  const regions = regionRows
    .map((row) => {
      const slug = slugForInstansi(row.instansi_name);
      if (!slug) return null;
      return {
        slug,
        instansi_name: row.instansi_name,
        exported: row.total_rows,
        top_value: row.top_value,
      };
    })
    .filter((row): row is SpendingIndex["regions"][number] => row != null);

  return {
    meta: {
      source: SOURCE_DB_PATH,
      extractedAt: new Date().toISOString(),
      regionCount: regions.length,
    },
    regions,
  };
}

export function loadRegion(slug: string): RegionExport {
  const instansiName = instansiForSlug(slug);
  if (!instansiName) {
    throw new Error(`Region not found: ${slug}`);
  }

  const db = requireDb();
  const instansi = db
    .query("SELECT * FROM instansi WHERE name = ?")
    .get(instansiName) as
    | { id: string; name: string; type: string; name_en: string | null }
    | null;

  const totalRows = (
    db
      .query("SELECT COUNT(*) AS n FROM realisasi WHERE instansi_name = ?")
      .get(instansiName) as { n: number }
  ).n;

  const rows = db
    .query(
      `SELECT *
       FROM realisasi
       WHERE instansi_name = ?
       ORDER BY CAST(total_value AS REAL) DESC`,
    )
    .all(instansiName) as Array<Record<string, unknown>>;

  const items = rows.map((row, index) => rowToSpendingItem(row, index + 1));

  return {
    meta: {
      source: SOURCE_DB_PATH,
      instansi_name: instansiName,
      slug,
      agency_id: instansi?.id ?? null,
      agency_type: instansi?.type ?? null,
      extractedAt: new Date().toISOString(),
      rankBy: "total_value",
      limit: items.length,
      count: items.length,
      total_rows_in_source: totalRows,
    },
    items,
  };
}

export async function loadAllSpendingPoints(options?: {
  region?: string;
}): Promise<MapSpendingPoint[]> {
  const instansiName = options?.region
    ? instansiForSlug(options.region)
    : undefined;

  if (options?.region && !instansiName) {
    throw new Error(`Region not found: ${options.region}`);
  }

  const [sheetCoordinates] = await Promise.all([
    loadSheetCoordinates().catch((error) => {
      console.warn("Failed to load sheet coordinates:", error);
      return new Map<number, { lat: number; lng: number; category: string | null }>();
    }),
  ]);

  const ids = [...sheetCoordinates.keys()];
  const rows = queryRealisasiByIds(ids, instansiName ?? undefined);

  const points: MapSpendingPoint[] = [];

  for (const row of rows) {
    const sheetCoord = sheetCoordinates.get(row.id as number);
    if (!sheetCoord) continue;

    const slug = slugForInstansi(row.instansi_name as string);
    if (!slug) continue;

    const item = rowToSpendingItem(row, row.rank as number);
    points.push({
      ...item,
      lat: sheetCoord.lat,
      lng: sheetCoord.lng,
      region_slug: slug,
      display_lat: sheetCoord.lat,
      display_lng: sheetCoord.lng,
      category: sheetCoord.category,
    });
  }

  return points;
}

export function toGeoJSON(points: MapSpendingPoint[]): SpendingGeoJSON {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
      properties: {
        id: point.id,
        kode_paket: point.kode_paket,
        package_name: point.package_name,
        instansi_name: point.instansi_name,
        vendor_name: point.vendor_name,
        procurement_type: point.procurement_type,
        category: point.category,
        year: point.year,
        total_value_num: point.total_value_num,
        rank: point.rank,
        score: point.score,
        region_slug: point.region_slug,
        lat: point.lat,
        lng: point.lng,
      },
    })),
  };
}

export type { SpendingItem };
