import type { StyleSpecification } from "maplibre-gl";

type MapStyleOptions = {
  hostname: string;
  maptilerKey: string | null;
};

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export function getMapStyle({
  hostname,
  maptilerKey,
}: MapStyleOptions): string | StyleSpecification | null {
  if (isLocalHost(hostname)) return OSM_RASTER_STYLE;
  if (!maptilerKey) return null;

  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;
}
