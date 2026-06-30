import { isDbAvailable } from "../../../src/lib/db";
import { searchRealisasi } from "../../../src/lib/realisasi-search";

export function GET(req: Request) {
  if (!isDbAvailable()) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? undefined;
  const order = url.searchParams.get("order") ?? undefined;

  try {
    const result = searchRealisasi({
      q: url.searchParams.get("q") ?? undefined,
      instansi: url.searchParams.get("instansi") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? "50"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
      sort: sort as Parameters<typeof searchRealisasi>[0]["sort"],
      order: order === "asc" || order === "desc" ? order : undefined,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
