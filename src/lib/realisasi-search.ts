import { getDb } from "./db";

export type RealisasiRow = {
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
};

export type InstansiOption = {
  name: string;
  count: number;
};

export type RealisasiSearchParams = {
  q?: string;
  instansi?: string;
  limit?: number;
  offset?: number;
  sort?: "total_value" | "package_name" | "vendor_name" | "instansi_name" | "year";
  order?: "asc" | "desc";
};

export type RealisasiSearchResult = {
  rows: RealisasiRow[];
  total: number;
  limit: number;
  offset: number;
};

const SEARCH_COLUMNS = [
  "package_name",
  "vendor_name",
  "instansi_name",
  "satker_name",
  "kode_paket",
  "procurement_method",
] as const;

const SORT_COLUMNS = new Set([
  "total_value",
  "package_name",
  "vendor_name",
  "instansi_name",
  "year",
]);

function clampLimit(limit: number | undefined): number {
  const n = limit ?? 50;
  return Math.min(Math.max(1, n), 100);
}

function clampOffset(offset: number | undefined): number {
  return Math.max(0, offset ?? 0);
}

function buildWhere(params: RealisasiSearchParams): {
  where: string;
  bindings: Array<string | number>;
} {
  const clauses: string[] = [];
  const bindings: Array<string | number> = [];

  const q = params.q?.trim();
  if (q) {
    const like = `%${q}%`;
    const ors = SEARCH_COLUMNS.map((col) => `${col} LIKE ?`).join(" OR ");
    clauses.push(`(${ors})`);
    for (let i = 0; i < SEARCH_COLUMNS.length; i++) {
      bindings.push(like);
    }
  }

  const instansi = params.instansi?.trim();
  if (instansi) {
    clauses.push("instansi_name = ?");
    bindings.push(instansi);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, bindings };
}

export function listInstansiOptions(): InstansiOption[] {
  const db = getDb();
  return db
    .query(
      `SELECT instansi_name AS name, COUNT(*) AS count
       FROM realisasi
       GROUP BY instansi_name
       ORDER BY instansi_name`,
    )
    .all() as InstansiOption[];
}

export function searchRealisasi(
  params: RealisasiSearchParams = {},
): RealisasiSearchResult {
  const db = getDb();
  const limit = clampLimit(params.limit);
  const offset = clampOffset(params.offset);
  const sort = SORT_COLUMNS.has(params.sort ?? "") ? params.sort! : "total_value";
  const order = params.order === "asc" ? "ASC" : "DESC";
  const orderExpr =
    sort === "total_value" ? `CAST(total_value AS REAL) ${order}` : `${sort} ${order}`;

  const { where, bindings } = buildWhere(params);

  const total = (
    db
      .query(`SELECT COUNT(*) AS n FROM realisasi ${where}`)
      .get(...bindings) as { n: number }
  ).n;

  const rows = db
    .query(
      `SELECT *
       FROM realisasi
       ${where}
       ORDER BY ${orderExpr}
       LIMIT ? OFFSET ?`,
    )
    .all(...bindings, limit, offset) as RealisasiRow[];

  return { rows, total, limit, offset };
}
