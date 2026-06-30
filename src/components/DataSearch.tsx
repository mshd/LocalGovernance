import { useCallback, useEffect, useState } from "react";
import type { InstansiOption, RealisasiRow } from "../lib/realisasi-search";

type SearchResponse = {
  rows: RealisasiRow[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;

function formatRupiah(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DataSearch() {
  const [dbAvailable, setDbAvailable] = useState<boolean | null>(null);
  const [instansiOptions, setInstansiOptions] = useState<InstansiOption[]>([]);
  const [query, setQuery] = useState("");
  const [instansi, setInstansi] = useState("");
  const [sort, setSort] = useState("total_value");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/db/status")
      .then((r) => r.json())
      .then((data: { available: boolean }) => setDbAvailable(data.available))
      .catch(() => setDbAvailable(false));
  }, []);

  useEffect(() => {
    if (!dbAvailable) return;
    fetch("/api/db/instansi")
      .then((r) => r.json())
      .then((data: { instansi: InstansiOption[] }) => setInstansiOptions(data.instansi))
      .catch(() => {});
  }, [dbAvailable]);

  const runSearch = useCallback(async () => {
    if (!dbAvailable) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (instansi) params.set("instansi", instansi);
    params.set("sort", sort);
    params.set("order", order);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/db/realisasi/search?${params}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Search failed (${res.status})`);
      }
      const data = (await res.json()) as SearchResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [dbAvailable, query, instansi, sort, order, page]);

  useEffect(() => {
    if (dbAvailable) runSearch();
  }, [dbAvailable, runSearch]);

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;

  if (dbAvailable === null) {
    return <div className="data-search-status">Checking database…</div>;
  }

  if (!dbAvailable) {
    return (
      <div className="data-search-missing">
        <h2>SQLite database not found</h2>
        <p>
          Place the raw export at <code>data/raw/bali-inaproc-2025.sqlite</code> to
          search procurement records directly.
        </p>
      </div>
    );
  }

  return (
    <div className="data-search">
      <form
        className="data-search-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          runSearch();
        }}
      >
        <label className="data-search-field data-search-field-grow">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Package, vendor, instansi, kode paket…"
            autoComplete="off"
          />
        </label>

        <label className="data-search-field">
          <span>Instansi</span>
          <select
            value={instansi}
            onChange={(e) => {
              setInstansi(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All</option>
            {instansiOptions.map((opt) => (
              <option key={opt.name} value={opt.name}>
                {opt.name} ({opt.count.toLocaleString("id-ID")})
              </option>
            ))}
          </select>
        </label>

        <label className="data-search-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="total_value">Total value</option>
            <option value="package_name">Package name</option>
            <option value="vendor_name">Vendor</option>
            <option value="instansi_name">Instansi</option>
            <option value="year">Year</option>
          </select>
        </label>

        <label className="data-search-field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => {
              setOrder(e.target.value as "asc" | "desc");
              setPage(0);
            }}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <button type="submit" className="data-search-submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <div className="data-search-error">{error}</div>}

      {result && (
        <div className="data-search-meta">
          {result.total.toLocaleString("id-ID")} rows
          {query.trim() && (
            <>
              {" "}
              matching &ldquo;{query.trim()}&rdquo;
            </>
          )}
          {instansi && <> in {instansi}</>}
        </div>
      )}

      <div className="data-search-table-wrap">
        <table className="data-search-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>Vendor</th>
              <th>Instansi</th>
              <th className="data-search-num">Value (IDR)</th>
              <th>Method</th>
              <th className="data-search-num">Year</th>
            </tr>
          </thead>
          <tbody>
            {loading && !result?.rows.length ? (
              <tr>
                <td colSpan={6} className="data-search-empty">
                  Loading…
                </td>
              </tr>
            ) : result?.rows.length ? (
              result.rows.map((row) => (
                <tr key={row.id}>
                  <td title={row.package_name ?? undefined}>
                    {row.package_name ?? "—"}
                  </td>
                  <td title={row.vendor_name ?? undefined}>
                    {row.vendor_name ?? "—"}
                  </td>
                  <td>{row.instansi_name}</td>
                  <td className="data-search-num">{formatRupiah(row.total_value)}</td>
                  <td>{row.procurement_method}</td>
                  <td className="data-search-num">{row.year}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="data-search-empty">
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result && totalPages > 1 && (
        <nav className="data-search-pagination" aria-label="Search results pages">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
