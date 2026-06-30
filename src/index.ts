import { serve } from "bun";
import index from "./index.html";
import { isDbAvailable } from "./lib/db";
import {
  listInstansiOptions,
  searchRealisasi,
} from "./lib/realisasi-search";
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
        if (!isDbAvailable()) {
          return Response.json({ error: "Database not available" }, { status: 503 });
        }

        const url = new URL(req.url);
        const region = url.searchParams.get("region") ?? undefined;

        const points = await loadAllSpendingPoints({ region });
        return Response.json({
          count: points.length,
          region: region ?? null,
          points,
        });
      },
    },

    "/api/spending/geojson": {
      GET: async (req) => {
        if (!isDbAvailable()) {
          return Response.json({ error: "Database not available" }, { status: 503 });
        }

        const url = new URL(req.url);
        const region = url.searchParams.get("region") ?? undefined;

        const points = await loadAllSpendingPoints({ region });
        return Response.json(toGeoJSON(points));
      },
    },

    "/api/spending/regions": {
      GET: () => {
        if (!isDbAvailable()) {
          return Response.json({ error: "Database not available" }, { status: 503 });
        }
        return Response.json(loadSpendingIndex());
      },
    },

    "/api/db/status": {
      GET: () => Response.json({ available: isDbAvailable() }),
    },

    "/api/db/instansi": {
      GET: () => {
        if (!isDbAvailable()) {
          return Response.json({ error: "Database not available" }, { status: 503 });
        }
        return Response.json({ instansi: listInstansiOptions() });
      },
    },

    "/api/db/realisasi/search": {
      GET: (req) => {
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
      },
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 MapTheBudget running at ${server.url}`);
