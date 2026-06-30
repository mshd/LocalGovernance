import { loadAllSpendingPoints, toGeoJSON } from "../../src/lib/spending";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const region = url.searchParams.get("region") ?? undefined;

  const points = await loadAllSpendingPoints({ region });
  return Response.json(toGeoJSON(points));
}
