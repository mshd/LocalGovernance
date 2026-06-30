import { isDbAvailable } from "../../src/lib/db";
import { listInstansiOptions } from "../../src/lib/realisasi-search";

export function GET() {
  if (!isDbAvailable()) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  return Response.json({ instansi: listInstansiOptions() });
}
