import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getRegionCentroid } from "../lib/region-centroids";
import {
  BALI_VIEW,
  categoryLabel,
  collectCategories,
  collectVendors,
  filterGeojson,
  popupHtml,
  regionLabel,
  sortRegions,
  type RegionOption,
} from "../lib/map-shared";
import type { SpendingGeoJSON, SpendingIndex } from "../lib/spending-types";
import { SpendingValueChart } from "./SpendingValueChart";

const BALI_CENTER: L.LatLngExpression = [BALI_VIEW.center[1], BALI_VIEW.center[0]];

function viewForGeojson(
  map: L.Map,
  clusterGroup: L.MarkerClusterGroup,
  geojson: SpendingGeoJSON,
  regionSlug: string,
) {
  if (geojson.features.length === 0) {
    if (regionSlug) {
      const centroid = getRegionCentroid(regionSlug);
      map.setView([centroid.lat, centroid.lng], 10.5);
    } else {
      map.setView(BALI_CENTER, BALI_VIEW.zoom);
    }
    return;
  }

  if (geojson.features.length === 1) {
    const [lng, lat] = geojson.features[0]!.geometry.coordinates;
    map.setView([lat, lng], 12);
    return;
  }

  const bounds = clusterGroup.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  } else {
    map.setView(BALI_CENTER, BALI_VIEW.zoom);
  }
}

function syncMarkers(
  clusterGroup: L.MarkerClusterGroup,
  geojson: SpendingGeoJSON,
) {
  clusterGroup.clearLayers();

  for (const feature of geojson.features) {
    const [lng, lat] = feature.geometry.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#ffffff",
      weight: 1,
      fillColor: "#dc2626",
      fillOpacity: 0.9,
    });
    marker.bindPopup(popupHtml(feature.properties));
    clusterGroup.addLayer(marker);
  }
}

export function SpendingMapLeaflet() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [allGeojson, setAllGeojson] = useState<SpendingGeoJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointCount, setPointCount] = useState(0);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredGeojson = useMemo(
    () =>
      allGeojson
        ? filterGeojson(
            allGeojson,
            selectedRegion,
            selectedVendor,
            selectedCategory,
          )
        : null,
    [allGeojson, selectedRegion, selectedVendor, selectedCategory],
  );

  useEffect(() => {
    let cancelled = false;
    const container = mapContainer.current;
    if (!container) return;

    async function bootstrap() {
      try {
        const [geoRes, regionsRes] = await Promise.all([
          fetch("/api/spending/geojson"),
          fetch("/api/spending/regions"),
        ]);

        const geojson = (await geoRes.json()) as SpendingGeoJSON;
        const regionsData = (await regionsRes.json()) as SpendingIndex;

        if (cancelled) return;

        setAllGeojson(geojson);
        setRegions(sortRegions(regionsData.regions));
        setVendors(collectVendors(geojson));
        setCategories(collectCategories(geojson));
        setPointCount(geojson.features.length);

        const map = L.map(container as HTMLElement, {
          center: BALI_CENTER,
          zoom: BALI_VIEW.zoom,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const clusterGroup = L.markerClusterGroup({
          maxClusterRadius: 45,
          disableClusteringAtZoom: 14,
        });

        syncMarkers(clusterGroup, geojson);
        map.addLayer(clusterGroup);

        L.control.scale({ metric: true, imperial: false }).addTo(map);

        viewForGeojson(map, clusterGroup, geojson, "");
        mapRef.current = map;
        clusterRef.current = clusterGroup;
        setLoading(false);
      } catch (cause) {
        console.error("Leaflet map bootstrap failed:", cause);
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
      clusterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterRef.current;
    if (!map || !clusterGroup || !filteredGeojson || loading) return;

    syncMarkers(clusterGroup, filteredGeojson);
    setPointCount(filteredGeojson.features.length);
    viewForGeojson(map, clusterGroup, filteredGeojson, selectedRegion);
  }, [filteredGeojson, selectedRegion, loading]);

  if (error) {
    return (
      <div className="map-error">
        <div>
          <p>{error}</p>
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
        <label className="map-toolbar-field">
          <span>Penyedia</span>
          <select
            className="map-toolbar-select-vendor"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            disabled={loading}
          >
            <option value="">Semua penyedia</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor} title={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>
        <label className="map-toolbar-field">
          <span>Kategori</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={loading}
          >
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
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
      <SpendingValueChart geojson={filteredGeojson} />
      <div ref={mapContainer} className="map" />
    </div>
  );
}
