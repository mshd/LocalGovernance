import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_DB = "data/raw/bali-inaproc-2025.sqlite";
const OUTPUT_DIR = "data/spending";
const LIMIT_PER_REGION = 500;

const SLUG_BY_INSTANSI: Record<string, string> = {
  "Provinsi Bali": "provinsi-bali",
  "KAB. Badung": "kab-badung",
  "Pemerintah Daerah Kota Denpasar": "kota-denpasar",
  "KAB. Jembrana": "kab-jembrana",
  "KAB. Bangli": "kab-bangli",
  "KAB. Buleleng": "kab-buleleng",
  "KAB. Gianyar": "kab-gianyar",
  "KAB. Klungkung": "kab-klungkung",
  "KAB. Tabanan": "kab-tabanan",
  "KAB. Karangasem": "kab-karangasem",
};

type RealisasiRow = {
  id: number;
  kode_paket: string;
  rup_id: string;
  agency_id: string;
  work_unit_id: number | null;
  year: number;
  transaction_source: string;
  funding_source_mask: number;
  company_id: string | null;
  vendor_name: string | null;
  procurement_method: string;
  procurement_type: string | null;
  package_name: string | null;
  package_name_en: string | null;
  status: string | null;
  total_value: string;
  domestic_value: string;
  instansi_name: string;
  satker_name: string | null;
};

type SpendingItem = RealisasiRow & {
  rank: number;
  total_value_num: number;
  score: number | null;
  show: boolean;
};

type RegionExport = {
  meta: {
    source: string;
    instansi_name: string;
    slug: string;
    agency_id: string | null;
    agency_type: string | null;
    extractedAt: string;
    rankBy: "total_value";
    limit: number;
    count: number;
    total_rows_in_source: number;
  };
  items: SpendingItem[];
};

type InstansiRow = {
  id: string;
  name: string;
  type: string;
  name_en: string | null;
};

const db = new Database(SOURCE_DB, { readonly: true });

const instansiByName = new Map<string, InstansiRow>();
for (const row of db.query("SELECT * FROM instansi").all() as InstansiRow[]) {
  instansiByName.set(row.name, row);
}

const regions = db
  .query(
    `SELECT instansi_name, COUNT(*) AS total_rows
     FROM realisasi
     GROUP BY instansi_name
     ORDER BY instansi_name`,
  )
  .all() as Array<{ instansi_name: string; total_rows: number }>;

await mkdir(OUTPUT_DIR, { recursive: true });

const summary: Array<{
  slug: string;
  instansi_name: string;
  exported: number;
  top_value: number;
}> = [];

for (const region of regions) {
  const { instansi_name } = region;
  const slug = SLUG_BY_INSTANSI[instansi_name];
  if (!slug) {
    console.warn(`No slug mapping for instansi: ${instansi_name}`);
    continue;
  }

  const instansi = instansiByName.get(instansi_name);

  const rows = db
    .query(
      `SELECT *
       FROM realisasi
       WHERE instansi_name = ?
       ORDER BY CAST(total_value AS REAL) DESC
       LIMIT ?`,
    )
    .all(instansi_name, LIMIT_PER_REGION) as RealisasiRow[];

  const items: SpendingItem[] = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    total_value_num: Number(row.total_value),
    score: null,
    show: false,
  }));

  const exportDoc: RegionExport = {
    meta: {
      source: SOURCE_DB,
      instansi_name,
      slug,
      agency_id: instansi?.id ?? null,
      agency_type: instansi?.type ?? null,
      extractedAt: new Date().toISOString(),
      rankBy: "total_value",
      limit: LIMIT_PER_REGION,
      count: items.length,
      total_rows_in_source: region.total_rows,
    },
    items,
  };

  const outPath = path.join(OUTPUT_DIR, `${slug}.json`);
  await Bun.write(outPath, JSON.stringify(exportDoc, null, 2) + "\n");

  summary.push({
    slug,
    instansi_name,
    exported: items.length,
    top_value: items[0]?.total_value_num ?? 0,
  });

  console.log(
    `Wrote ${outPath} — ${items.length} items (top: Rp ${items[0]?.total_value_num.toLocaleString("id-ID") ?? 0})`,
  );
}

const indexPath = path.join(OUTPUT_DIR, "index.json");
await Bun.write(
  indexPath,
  JSON.stringify(
    {
      meta: {
        source: SOURCE_DB,
        extractedAt: new Date().toISOString(),
        limitPerRegion: LIMIT_PER_REGION,
        regionCount: summary.length,
      },
      regions: summary,
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nDone. ${summary.length} region files + index.json in ${OUTPUT_DIR}/`);
