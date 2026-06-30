export function GET() {
  return Response.json({
    maptilerKey: process.env.MAPTILER_API_KEY ?? null,
  });
}
