import { expect, test } from "bun:test";
import { getMapStyle } from "./map-style";

test("uses OSM raster tiles on localhost without requiring MapTiler", () => {
  const style = getMapStyle({ hostname: "localhost", maptilerKey: null });

  expect(typeof style).toBe("object");
  expect(style).toMatchObject({
    version: 8,
    sources: {
      osm: {
        type: "raster",
      },
    },
  });
});

test("uses MapTiler style URL away from localhost", () => {
  const style = getMapStyle({
    hostname: "mapthebudget.example",
    maptilerKey: "abc123",
  });

  expect(style).toBe(
    "https://api.maptiler.com/maps/streets-v2/style.json?key=abc123",
  );
});
