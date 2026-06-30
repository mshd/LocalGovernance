import { expect, test } from "bun:test";
import { toGeoJSON } from "./spending";
import type { MapSpendingPoint } from "./spending-types";

function spendingPoint(overrides: Partial<MapSpendingPoint>): MapSpendingPoint {
  return {
    id: 17943937,
    kode_paket: "10064527000",
    rup_id: "10064527000",
    agency_id: "D224",
    work_unit_id: null,
    year: 2024,
    transaction_source: "lpse",
    funding_source_mask: 0,
    company_id: null,
    vendor_name: null,
    procurement_method: "tender",
    procurement_type: "PEKERJAAN_KONSTRUKSI",
    package_name: "Belanja Modal Bangunan Gedung Tempat Pendidikan Pengawasan SMP Negeri 3 Kuta Utara",
    package_name_en: null,
    status: null,
    total_value: "0",
    domestic_value: "0",
    instansi_name: "Pemerintah Kabupaten Badung",
    satker_name: null,
    rank: 1,
    total_value_num: 0,
    score: null,
    show: true,
    region_slug: "kab-badung",
    lat: -8.673314460015831,
    lng: 115.16930486118568,
    display_lat: -8.661528007131304,
    display_lng: 115.173881595027,
    category: "Pendidikan",
    ...overrides,
  };
}

test("GeoJSON point geometry uses the original sheet coordinates", () => {
  const geojson = toGeoJSON([spendingPoint({})]);

  expect(geojson.features[0]?.geometry.coordinates).toEqual([
    115.16930486118568,
    -8.673314460015831,
  ]);
});
