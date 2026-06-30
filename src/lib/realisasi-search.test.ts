import { describe, expect, test } from "bun:test";
import { isDbAvailable } from "./db";
import { listInstansiOptions, searchRealisasi } from "./realisasi-search";

const dbAvailable = isDbAvailable();

describe.skipIf(!dbAvailable)("realisasi-search", () => {
  test("listInstansiOptions returns Bali regions", () => {
    const options = listInstansiOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty("name");
    expect(options[0]).toHaveProperty("count");
  });

  test("searchRealisasi returns paginated rows", () => {
    const result = searchRealisasi({ limit: 5 });
    expect(result.rows.length).toBe(5);
    expect(result.total).toBeGreaterThan(1000);
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(0);
  });

  test("searchRealisasi filters by query", () => {
    const result = searchRealisasi({ q: "jalan", limit: 10 });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    const haystack = result.rows
      .map((r) =>
        [r.package_name, r.vendor_name, r.instansi_name, r.kode_paket]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      )
      .join(" ");
    expect(haystack).toContain("jalan");
  });

  test("searchRealisasi filters by instansi", () => {
    const instansi = "KAB. Badung";
    const result = searchRealisasi({ instansi, limit: 5 });
    expect(result.rows.every((r) => r.instansi_name === instansi)).toBe(true);
  });

  test("searchRealisasi clamps limit to 100", () => {
    const result = searchRealisasi({ limit: 500 });
    expect(result.limit).toBe(100);
  });
});
