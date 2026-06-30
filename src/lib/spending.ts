import path from "node:path";
import { loadSheetCoordinates } from "./sheet-coordinates";
import type {
  MapSpendingPoint,
  RegionExport,
  SpendingGeoJSON,
  SpendingIndex,
  SpendingItem,
} from "./spending-types";

const SPENDING_DIR = path.join(process.cwd(), "data", "spending");

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function loadSpendingIndex(): Promise<SpendingIndex> {
  const file = Bun.file(path.join(SPENDING_DIR, "index.json"));
  return (await file.json()) as SpendingIndex;
}

export async function loadRegion(slug: string): Promise<RegionExport> {
  const file = Bun.file(path.join(SPENDING_DIR, `${slug}.json`));
  if (!(await file.exists())) {
    throw new Error(`Region not found: ${slug}`);
  }
  return (await file.json()) as RegionExport;
}

export async function loadAllSpendingPoints(options?: {
  region?: string;
}): Promise<MapSpendingPoint[]> {
  const [index, sheetCoordinates] = await Promise.all([
    loadSpendingIndex(),
    loadSheetCoordinates().catch((error) => {
      console.warn("Failed to load sheet coordinates:", error);
      return new Map<number, { lat: number; lng: number }>();
    }),
  ]);

  const slugs = options?.region
    ? index.regions.filter((r) => r.slug === options.region).map((r) => r.slug)
    : index.regions.map((r) => r.slug);

  const points: MapSpendingPoint[] = [];

  for (const slug of slugs) {
    const region = await loadRegion(slug);
    for (const item of region.items) {
      const sheetCoord = sheetCoordinates.get(item.id);
      if (!sheetCoord) continue;

      points.push({
        ...item,
        lat: sheetCoord.lat,
        lng: sheetCoord.lng,
        region_slug: slug,
        display_lat: sheetCoord.lat,
        display_lng: sheetCoord.lng,
      });
    }
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
