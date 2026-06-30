import { useMemo, useState } from "react";
import {
  formatShortIdr,
  regionLabel,
  topPackagesByValue,
  type TopPackage,
} from "../lib/map-shared";
import type { SpendingGeoJSON } from "../lib/spending-types";

const TOP_PACKAGE_COUNT = 10;

type SpendingTopPackagesProps = {
  geojson: SpendingGeoJSON | null;
  onSelect?: (pkg: TopPackage) => void;
};

function packageTitle(pkg: TopPackage): string {
  return pkg.package_name ?? pkg.kode_paket;
}

export function SpendingTopPackages({
  geojson,
  onSelect,
}: SpendingTopPackagesProps) {
  const [expanded, setExpanded] = useState(true);

  const top = useMemo(
    () => (geojson ? topPackagesByValue(geojson, TOP_PACKAGE_COUNT) : []),
    [geojson],
  );

  return (
    <div
      className={`map-panel map-top-packages${expanded ? "" : " map-top-packages--collapsed"}`}
    >
      <div className="map-top-packages-header">
        <button
          type="button"
          className="map-top-packages-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="map-top-packages-toggle-label">Paket terbesar</span>
          <span className="map-top-packages-chevron" aria-hidden>
            {expanded ? "▾" : "◂"}
          </span>
        </button>
      </div>
      {expanded &&
        (top.length === 0 ? (
          <span className="map-top-packages-empty">Tidak ada data</span>
        ) : (
          <ol className="map-top-packages-list">
            {top.map((pkg, index) => (
              <li key={pkg.id}>
                <button
                  type="button"
                  className="map-top-packages-item"
                  onClick={() => onSelect?.(pkg)}
                  title={packageTitle(pkg)}
                >
                  <span className="map-top-packages-rank">{index + 1}</span>
                  <span className="map-top-packages-text">
                    <span className="map-top-packages-name">
                      {packageTitle(pkg)}
                    </span>
                    <span className="map-top-packages-meta">
                      {formatShortIdr(pkg.total_value_num)} ·{" "}
                      {regionLabel(pkg.instansi_name)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ))}
    </div>
  );
}
