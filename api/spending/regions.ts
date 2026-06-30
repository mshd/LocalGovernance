import { loadSpendingIndex } from "../../src/lib/spending";

export async function GET() {
  return Response.json(await loadSpendingIndex());
}
