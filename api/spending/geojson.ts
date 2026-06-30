import { isDbAvailable } from "../../src/lib/db";
import { loadAllSpendingPoints, toGeoJSON } from "../../src/lib/spending";

export async function GET(req: Request) {
  if (!isDbAvailable()) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  const url = new URL(req.url);
  const region = url.searchParams.get("region") ?? undefined;

  const points = await loadAllSpendingPoints({ region });
  return Response.json(toGeoJSON(points));
}
