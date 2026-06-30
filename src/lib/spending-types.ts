export type SpendingItem = {
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
  rank: number;
  total_value_num: number;
  score: number | null;
  show: boolean;
};

export type RegionExport = {
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

export type SpendingIndex = {
  meta: {
    source: string;
    extractedAt: string;
    limitPerRegion?: number;
    regionCount: number;
  };
  regions: Array<{
    slug: string;
    instansi_name: string;
    exported: number;
    top_value: number;
  }>;
};

export type MapSpendingPoint = SpendingItem & {
  region_slug: string;
  lat: number;
  lng: number;
  display_lat: number;
  display_lng: number;
  category: string | null;
};

export type SpendingGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: number;
    kode_paket: string;
    package_name: string | null;
    instansi_name: string;
    vendor_name: string | null;
    procurement_type: string | null;
    category: string | null;
    year: number;
    total_value_num: number;
    rank: number;
    score: number | null;
    region_slug: string;
    lat: number;
    lng: number;
  }
>;
