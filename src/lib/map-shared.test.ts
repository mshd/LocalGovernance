import { describe, expect, test } from "bun:test";
import { collectCategories, filterGeojson, valueByYear } from "./map-shared";
import type { SpendingGeoJSON } from "./spending-types";

function feature(
  year: number,
  total: number,
  overrides: Partial<SpendingGeoJSON["features"][0]["properties"]> = {},
): SpendingGeoJSON["features"][0] {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [115, -8] },
    properties: {
      id: year,
      kode_paket: `PKG-${year}`,
      package_name: null,
      instansi_name: "Test",
      vendor_name: null,
      procurement_type: null,
      category: null,
      year,
      total_value_num: total,
      rank: 1,
      score: null,
      region_slug: "test",
      lat: -8,
      lng: 115,
      ...overrides,
    },
  };
}

describe("valueByYear", () => {
  test("sums contract values by year in ascending order", () => {
    const geojson: SpendingGeoJSON = {
      type: "FeatureCollection",
      features: [
        feature(2023, 100),
        feature(2024, 250),
        feature(2023, 50),
        feature(2022, 10),
      ],
    };

    expect(valueByYear(geojson)).toEqual([
      { year: 2022, total: 10 },
      { year: 2023, total: 150 },
      { year: 2024, total: 250 },
    ]);
  });
});

describe("filterGeojson", () => {
  test("filters by sheet category", () => {
    const geojson: SpendingGeoJSON = {
      type: "FeatureCollection",
      features: [
        feature(2023, 100, { category: "Fasum" }),
        feature(2024, 200, { category: "Pemerintah" }),
      ],
    };

    const filtered = filterGeojson(geojson, "", "", "Pemerintah");
    expect(filtered.features).toHaveLength(1);
    expect(filtered.features[0]?.properties.category).toBe("Pemerintah");
  });
});

describe("collectCategories", () => {
  test("returns unique sorted sheet categories", () => {
    const geojson: SpendingGeoJSON = {
      type: "FeatureCollection",
      features: [
        feature(2023, 100, { category: "Pemerintah" }),
        feature(2024, 200, { category: "Fasum" }),
        feature(2025, 300, { category: "Pemerintah" }),
      ],
    };

    expect(collectCategories(geojson)).toEqual(["Fasum", "Pemerintah"]);
  });
});
