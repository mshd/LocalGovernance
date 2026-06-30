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

export function filterGeojson(
  geojson: SpendingGeoJSON,
  regionSlug: string,
): SpendingGeoJSON {
  if (!regionSlug) return geojson;

  return {
    type: "FeatureCollection",
    features: geojson.features.filter(
      (feature) => feature.properties.region_slug === regionSlug,
    ),
  };
}

function formatCategory(procurementType: string | null): string {
  if (!procurementType) return "—";
  return procurementType.replaceAll("_", " ");
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
  const category = escapeHtml(formatCategory(props.procurement_type));
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
