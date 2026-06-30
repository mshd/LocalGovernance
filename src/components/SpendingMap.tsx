import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getRegionCentroid } from "../lib/region-centroids";
import type { SpendingGeoJSON, SpendingIndex } from "../lib/spending-types";

type MapConfig = {
  maptilerKey: string | null;
};

type RegionOption = SpendingIndex["regions"][number];

const BALI_VIEW = { center: [115.1889, -8.4095] as [number, number], zoom: 8.2 };

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

function regionLabel(instansiName: string): string {
  if (instansiName === "Provinsi Bali") return "Provinsi Bali";
  if (instansiName.startsWith("KAB. ")) return instansiName.slice(5);
  if (instansiName.startsWith("Pemerintah Daerah Kota ")) {
    return instansiName.slice(23);
  }
  return instansiName;
}

function sortRegions(regions: RegionOption[]): RegionOption[] {
  return [...regions].sort((a, b) => {
    if (a.slug === "provinsi-bali") return -1;
    if (b.slug === "provinsi-bali") return 1;
    return regionLabel(a.instansi_name).localeCompare(
      regionLabel(b.instansi_name),
      "id",
    );
  });
}

function filterGeojson(
  geojson: SpendingGeoJSON,
  regionSlug: string,
): SpendingGeoJSON {
  if (!regionSlug) return geojson;

  return {
    type: "FeatureCollection",
    features: geojson.features.filter(
      (feature: SpendingGeoJSON["features"][number]) =>
        feature.properties.region_slug === regionSlug,
    ),
  };
}

function popupHtml(props: SpendingGeoJSON["features"][0]["properties"]): string {
  const title = escapeHtml(props.package_name ?? props.kode_paket);
  const instansi = escapeHtml(props.instansi_name);
  const vendor = props.vendor_name
    ? `<div>Penyedia: ${escapeHtml(props.vendor_name)}</div>`
    : "";
  const score =
    props.score != null ? `<div>Score: ${props.score}</div>` : "";

  return `
    <div class="spending-popup">
      <strong>${title}</strong>
      <div>${instansi}</div>
      <div>${formatIdr(props.total_value_num)}</div>
      <div>Peringkat #${props.rank} · ${escapeHtml(props.region_slug)}</div>
      ${vendor}
      ${score}
    </div>
  `;
}

function viewForGeojson(
  map: maplibregl.Map,
  geojson: SpendingGeoJSON,
  regionSlug: string,
) {
  if (geojson.features.length === 0) {
    if (regionSlug) {
      const centroid = getRegionCentroid(regionSlug);
      map.jumpTo({ center: [centroid.lng, centroid.lat], zoom: 10.5 });
    } else {
      map.jumpTo({ center: BALI_VIEW.center, zoom: BALI_VIEW.zoom });
    }
    return;
  }

  if (geojson.features.length === 1) {
    const [lng, lat] = geojson.features[0]!.geometry.coordinates;
    map.jumpTo({ center: [lng, lat], zoom: 12 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const feature of geojson.features) {
    const [lng, lat] = feature.geometry.coordinates;
    bounds.extend([lng, lat]);
  }

  try {
    map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
  } catch {
    map.jumpTo({ center: BALI_VIEW.center, zoom: BALI_VIEW.zoom });
  }
}

function addSpendingLayers(map: maplibregl.Map, geojson: SpendingGeoJSON) {
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
      "circle-color": "#dc2626",
      "circle-radius": 7,
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

    const coordinates = [...feature.geometry.coordinates] as [number, number];
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
}

export function SpendingMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const allGeojsonRef = useRef<SpendingGeoJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointCount, setPointCount] = useState(0);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");

  useEffect(() => {
    let cancelled = false;
    const container = mapContainer.current;
    if (!container) return;

    async function bootstrap() {
      try {
        const [configRes, geoRes, regionsRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/spending/geojson"),
          fetch("/api/spending/regions"),
        ]);

        const config = (await configRes.json()) as MapConfig;
        const geojson = (await geoRes.json()) as SpendingGeoJSON;
        const regionsData = (await regionsRes.json()) as SpendingIndex;

        if (cancelled) return;

        if (!config.maptilerKey) {
          setError(
            "Set MAPTILER_API_KEY in .env (get a free key at maptiler.com/cloud)",
          );
          setLoading(false);
          return;
        }

        allGeojsonRef.current = geojson;
        setRegions(sortRegions(regionsData.regions));
        setPointCount(geojson.features.length);

        const map = new maplibregl.Map({
          container: container as HTMLElement,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${config.maptilerKey}`,
          center: BALI_VIEW.center,
          zoom: BALI_VIEW.zoom,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(
          new maplibregl.ScaleControl({ unit: "metric" }),
          "bottom-left",
        );

        map.on("error", (event) => {
          console.warn("MapLibre tile warning:", event.error?.message ?? event);
        });

        map.on("style.load", () => {
          if (cancelled) return;

          map.resize();
          addSpendingLayers(map, geojson);
          viewForGeojson(map, geojson, "");
          mapRef.current = map;
          setLoading(false);
        });

        mapRef.current = map;
      } catch (cause) {
        console.error("Map bootstrap failed:", cause);
        if (!cancelled) {
          setError("Failed to load map or spending data.");
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const allGeojson = allGeojsonRef.current;
    if (!map || !allGeojson || loading) return;

    const source = map.getSource("spending") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const filtered = filterGeojson(allGeojson, selectedRegion);
    source.setData(filtered);
    setPointCount(filtered.features.length);
    viewForGeojson(map, filtered, selectedRegion);
  }, [selectedRegion, loading]);

  if (error) {
    return (
      <div className="map-error">
        <div>
          <p>{error}</p>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and add your
            MapTiler key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-toolbar">
        <label className="map-toolbar-field">
          <span>Instansi</span>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            disabled={loading}
          >
            <option value="">Semua Bali</option>
            {regions.map((region) => (
              <option key={region.slug} value={region.slug}>
                {regionLabel(region.instansi_name)}
              </option>
            ))}
          </select>
        </label>
        <span>
          {pointCount.toLocaleString("id-ID")} packages with coordinates
        </span>
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
