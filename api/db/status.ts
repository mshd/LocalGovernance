import { isDbAvailable } from "../../src/lib/db";

export function GET() {
  return Response.json({ available: isDbAvailable() });
}
