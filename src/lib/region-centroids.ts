/** Regional fallback centroids when a package has no sheet coordinate. */
export const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "provinsi-bali": { lat: -8.4095, lng: 115.1889 },
  "kab-badung": { lat: -8.5819, lng: 115.1771 },
  "kota-denpasar": { lat: -8.6705, lng: 115.2126 },
  "kab-jembrana": { lat: -8.3599, lng: 114.6298 },
  "kab-bangli": { lat: -8.4543, lng: 115.3549 },
  "kab-buleleng": { lat: -8.1135, lng: 115.1263 },
  "kab-gianyar": { lat: -8.5442, lng: 115.3252 },
  "kab-klungkung": { lat: -8.7278, lng: 115.5444 },
  "kab-tabanan": { lat: -8.5449, lng: 115.1258 },
  "kab-karangasem": { lat: -8.4243, lng: 115.6186 },
};

const BALI_FALLBACK = REGION_CENTROIDS["provinsi-bali"]!;

export function getRegionCentroid(slug: string): { lat: number; lng: number } {
  return REGION_CENTROIDS[slug] ?? BALI_FALLBACK;
}
