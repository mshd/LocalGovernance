import type { SpendingGeoJSON, SpendingIndex } from "./spending-types";

export type RegionOption = SpendingIndex["regions"][number];

export const BALI_VIEW = { center: [115.1889, -8.4095] as [number, number], zoom: 8.2 };

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function regionLabel(instansiName: string): string {
  if (instansiName === "Provinsi Bali") return "Provinsi Bali";
  if (instansiName.startsWith("KAB. ")) return instansiName.slice(5);
  if (instansiName.startsWith("Pemerintah Daerah Kota ")) {
    return instansiName.slice(23);
  }
  return instansiName;
}

export function sortRegions(regions: RegionOption[]): RegionOption[] {
  return [...regions].sort((a, b) => {
    if (a.slug === "provinsi-bali") return -1;
    if (b.slug === "provinsi-bali") return 1;
    return regionLabel(a.instansi_name).localeCompare(
      regionLabel(b.instansi_name),
      "id",
    );
  });
}

export const MAX_VENDOR_SELECT_LENGTH = 80;

export function collectVendors(geojson: SpendingGeoJSON): string[] {
  const vendors = new Set<string>();

  for (const feature of geojson.features) {
    const name = feature.properties.vendor_name;
    if (name && name.length <= MAX_VENDOR_SELECT_LENGTH) {
      vendors.add(name);
    }
  }

  return [...vendors].sort((a, b) => a.localeCompare(b, "id"));
}

export function categoryLabel(category: string | null): string {
  return category ?? "—";
}

export function collectCategories(geojson: SpendingGeoJSON): string[] {
  const categories = new Set<string>();

  for (const feature of geojson.features) {
    const value = feature.properties.category;
    if (value) categories.add(value);
  }

  return [...categories].sort((a, b) => a.localeCompare(b, "id"));
}

export function filterGeojson(
  geojson: SpendingGeoJSON,
  regionSlug: string,
  vendorName = "",
  category = "",
): SpendingGeoJSON {
  if (!regionSlug && !vendorName && !category) return geojson;

  return {
    type: "FeatureCollection",
    features: geojson.features.filter((feature) => {
      const props = feature.properties;
      if (regionSlug && props.region_slug !== regionSlug) return false;
      if (vendorName && props.vendor_name !== vendorName) return false;
      if (category && props.category !== category) return false;
      return true;
    }),
  };
}

export type YearValue = { year: number; total: number };

export type TopPackage = SpendingGeoJSON["features"][0]["properties"];

export function topPackagesByValue(
  geojson: SpendingGeoJSON,
  limit = 3,
): TopPackage[] {
  return [...geojson.features]
    .sort((a, b) => b.properties.total_value_num - a.properties.total_value_num)
    .slice(0, limit)
    .map((feature) => feature.properties);
}

export function valueByYear(geojson: SpendingGeoJSON): YearValue[] {
  const totals = new Map<number, number>();

  for (const feature of geojson.features) {
    const { year, total_value_num } = feature.properties;
    totals.set(year, (totals.get(year) ?? 0) + total_value_num);
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, total]) => ({ year, total }));
}

export function formatShortIdr(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`;
  }
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
  }
  return formatIdr(value);
}

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function popupHtml(
  props: SpendingGeoJSON["features"][0]["properties"],
): string {
  const title = escapeHtml(props.package_name ?? props.kode_paket);
  const instansi = escapeHtml(props.instansi_name);
  const category = escapeHtml(categoryLabel(props.category));
  const coordinates = formatCoordinates(props.lat, props.lng);
  const mapsUrl = googleMapsUrl(props.lat, props.lng);
  const vendor = props.vendor_name
    ? `<div>Penyedia: ${escapeHtml(props.vendor_name)}</div>`
    : "";
  const score =
    props.score != null ? `<div>Score: ${props.score}</div>` : "";

  return `
    <div class="spending-popup">
      <strong>${title}</strong>
      <div>${instansi}</div>
      <div>Kategori: ${category}</div>
      <div>Tahun: ${props.year}</div>
      <div>${formatIdr(props.total_value_num)}</div>
      <div>Peringkat #${props.rank} · ${escapeHtml(props.region_slug)}</div>
      <div>Koordinat: ${coordinates}</div>
      <div><a class="spending-popup-maps" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Buka di Google Maps</a></div>
      ${vendor}
      ${score}
    </div>
  `;
}
