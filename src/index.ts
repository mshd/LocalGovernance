import { serve } from "bun";
import index from "./index.html";
import {
  loadAllSpendingPoints,
  loadSpendingIndex,
  toGeoJSON,
} from "./lib/spending";

const maptilerKey = process.env.MAPTILER_API_KEY ?? null;

const server = serve({
  routes: {
    "/api/config": {
      GET: () =>
        Response.json({
          maptilerKey,
        }),
    },

    "/api/spending": {
      GET: async (req) => {
        const url = new URL(req.url);
        const region = url.searchParams.get("region") ?? undefined;
        const showOnly = url.searchParams.get("showOnly") === "true";

        const points = await loadAllSpendingPoints({ region, showOnly });
        return Response.json({
          count: points.length,
          showOnly,
          region: region ?? null,
          points,
        });
      },
    },

    "/api/spending/geojson": {
      GET: async (req) => {
        const url = new URL(req.url);
        const region = url.searchParams.get("region") ?? undefined;
        const showOnly = url.searchParams.get("showOnly") === "true";

        const points = await loadAllSpendingPoints({ region, showOnly });
        return Response.json(toGeoJSON(points));
      },
    },

    "/api/spending/regions": {
      GET: async () => Response.json(await loadSpendingIndex()),
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Local Governance running at ${server.url}`);
