import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SpendingGeoJSON } from "../lib/spending-types";

type MapConfig = {
  maptilerKey: string | null;
};

function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function popupHtml(props: SpendingGeoJSON["features"][0]["properties"]): string {
  const title = escapeHtml(props.package_name ?? props.kode_paket);
  const instansi = escapeHtml(props.instansi_name);
  const vendor = props.vendor_name
    ? `<div>Penyedia: ${escapeHtml(props.vendor_name)}</div>`
    : "";
  const score =
    props.score != null ? `<div>Score: ${props.score}</div>` : "";
  const curated = props.show
    ? `<div><strong>Ditampilkan</strong> (show: true)</div>`
    : "";

  return `
    <div class="spending-popup">
      <strong>${title}</strong>
      <div>${instansi}</div>
      <div>${formatIdr(props.total_value_num)}</div>
      <div>Peringkat #${props.rank} · ${escapeHtml(props.region_slug)}</div>
      ${vendor}
      ${score}
      ${curated}
    </div>
  `;
}

export function SpendingMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointCount, setPointCount] = useState(0);
  const [showOnly, setShowOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const container = mapContainer.current;
      if (!container) return;

      mapRef.current?.remove();
      mapRef.current = null;
      setLoading(true);
      setError(null);

      try {
        const [configRes, geoRes] = await Promise.all([
          fetch("/api/config"),
          fetch(`/api/spending/geojson?showOnly=${showOnly}`),
        ]);

        const config = (await configRes.json()) as MapConfig;
        const geojson = (await geoRes.json()) as SpendingGeoJSON;

        if (!config.maptilerKey) {
          setError(
            "Set MAPTILER_API_KEY in .env (get a free key at maptiler.com/cloud)",
          );
          setLoading(false);
          return;
        }

        if (cancelled) return;

        setPointCount(geojson.features.length);

        const map = new maplibregl.Map({
          container,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${config.maptilerKey}`,
          center: [115.1889, -8.4095],
          zoom: 8.2,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(
          new maplibregl.ScaleControl({ unit: "metric" }),
          "bottom-left",
        );

        map.on("load", () => {
          if (geojson.features.length === 0) {
            setError(
              showOnly
                ? "No packages with show: true yet. Turn off the filter or set show: true in the JSON files."
                : "No spending data found.",
            );
            setLoading(false);
            return;
          }

          map.addSource("spending", {
            type: "geojson",
            data: geojson,
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 45,
          });

          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "spending",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#fca5a5",
                20,
                "#f87171",
                100,
                "#dc2626",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                16,
                20,
                22,
                100,
                28,
              ],
            },
          });

          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "spending",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          map.addLayer({
            id: "unclustered-point",
            type: "circle",
            source: "spending",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "case",
                ["get", "show"],
                "#dc2626",
                "#64748b",
              ],
              "circle-radius": [
                "case",
                ["get", "show"],
                7,
                5,
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });

          map.on("click", "clusters", async (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ["clusters"],
            });
            const feature = features[0];
            if (!feature) return;

            const clusterId = feature.properties?.cluster_id;
            const source = map.getSource("spending") as maplibregl.GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(clusterId);
            const geometry = feature.geometry;
            if (geometry.type !== "Point") return;

            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom,
            });
          });

          map.on("click", "unclustered-point", (e) => {
            const feature = e.features?.[0];
            if (!feature || feature.geometry.type !== "Point") return;

            const coordinates = [...feature.geometry.coordinates] as [
              number,
              number,
            ];
            const props = feature.properties as SpendingGeoJSON["features"][0]["properties"];

            new maplibregl.Popup({ offset: 16 })
              .setLngLat(coordinates)
              .setHTML(popupHtml(props))
              .addTo(map);
          });

          map.on("mouseenter", "clusters", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "clusters", () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
          });

          setLoading(false);
        });

        mapRef.current = map;
      } catch {
        if (!cancelled) {
          setError("Failed to load map or spending data.");
          setLoading(false);
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [showOnly]);

  if (error) {
    return (
      <div className="map-error">
        <div>
          <p>{error}</p>
          {!showOnly && (
            <p>
              Copy <code>.env.example</code> to <code>.env</code> and add your
              MapTiler key.
            </p>
          )}
          {showOnly && (
            <button type="button" onClick={() => setShowOnly(false)}>
              Show all packages
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-toolbar">
        <span>{pointCount.toLocaleString("id-ID")} packages</span>
        <label>
          <input
            type="checkbox"
            checked={showOnly}
            onChange={(e) => setShowOnly(e.target.checked)}
          />
          Show curated only (show: true)
        </label>
      </div>
      {loading && (
        <div className="map-loading">
          <p>Loading map…</p>
        </div>
      )}
      <div ref={mapContainer} className="map" />
    </div>
  );
}
