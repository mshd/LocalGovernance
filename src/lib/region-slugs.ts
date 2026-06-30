export const SLUG_BY_INSTANSI: Record<string, string> = {
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

export const INSTANSI_BY_SLUG = Object.fromEntries(
  Object.entries(SLUG_BY_INSTANSI).map(([instansi, slug]) => [slug, instansi]),
) as Record<string, string>;

export function slugForInstansi(instansiName: string): string | null {
  return SLUG_BY_INSTANSI[instansiName] ?? null;
}

export function instansiForSlug(slug: string): string | null {
  return INSTANSI_BY_SLUG[slug] ?? null;
}
