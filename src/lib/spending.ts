import type {
  MapSpendingPoint,
  RegionExport,
  SpendingGeoJSON,
  SpendingIndex,
  SpendingItem,
} from "./spending-types";

const SPENDING_DIR = "data/spending";

/** Spread overlapping centroid points in a deterministic ring. */
export function spreadCoordinates(
  lat: number,
  lng: number,
  seed: string,
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }

  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.004 + (Math.abs(hash) % 80) / 8000;
  const latRad = (lat * Math.PI) / 180;

  return {
    lat: lat + radius * Math.sin(angle),
    lng: lng + (radius * Math.cos(angle)) / Math.cos(latRad),
  };
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function loadSpendingIndex(): Promise<SpendingIndex> {
  const file = Bun.file(`${SPENDING_DIR}/index.json`);
  return (await file.json()) as SpendingIndex;
}

export async function loadRegion(slug: string): Promise<RegionExport> {
  const file = Bun.file(`${SPENDING_DIR}/${slug}.json`);
  if (!(await file.exists())) {
    throw new Error(`Region not found: ${slug}`);
  }
  return (await file.json()) as RegionExport;
}

export async function loadAllSpendingPoints(options?: {
  region?: string;
  showOnly?: boolean;
}): Promise<MapSpendingPoint[]> {
  const index = await loadSpendingIndex();
  const slugs = options?.region
    ? index.regions.filter((r) => r.slug === options.region).map((r) => r.slug)
    : index.regions.map((r) => r.slug);

  const points: MapSpendingPoint[] = [];

  for (const slug of slugs) {
    const region = await loadRegion(slug);
    for (const item of region.items) {
      if (options?.showOnly && !item.show) continue;

      const spread = spreadCoordinates(item.lat, item.lng, item.kode_paket);
      points.push({
        ...item,
        region_slug: slug,
        display_lat: spread.lat,
        display_lng: spread.lng,
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
        coordinates: [point.display_lng, point.display_lat],
      },
      properties: {
        id: point.id,
        kode_paket: point.kode_paket,
        package_name: point.package_name,
        instansi_name: point.instansi_name,
        vendor_name: point.vendor_name,
        total_value_num: point.total_value_num,
        rank: point.rank,
        score: point.score,
        show: point.show,
        region_slug: point.region_slug,
      },
    })),
  };
}

export type { SpendingItem };
