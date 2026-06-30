import { useEffect, useMemo, useRef } from "react";
import Highcharts from "highcharts";
import {
  formatIdr,
  formatShortIdr,
  valueByYear,
  type YearValue,
} from "../lib/map-shared";
import type { SpendingGeoJSON } from "../lib/spending-types";

type SpendingValueChartProps = {
  geojson: SpendingGeoJSON | null;
};

function chartOptions(series: YearValue[]): Highcharts.Options {
  return {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 132,
      spacing: [6, 6, 2, 2],
    },
    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: series.map((point) => String(point.year)),
      labels: { style: { color: "#cbd5e1", fontSize: "10px" } },
      lineColor: "#475569",
      tickColor: "#475569",
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        style: { color: "#94a3b8", fontSize: "10px" },
        formatter() {
          return formatShortIdr(this.value as number);
        },
      },
      gridLineColor: "#334155",
    },
    tooltip: {
      outside: true,
      formatter() {
        return `<b>${this.x}</b><br/>${formatIdr(this.y as number)}`;
      },
    },
    plotOptions: {
      column: {
        borderWidth: 0,
        borderRadius: 2,
        color: "#dc2626",
      },
    },
    series: [
      {
        type: "column",
        name: "Nilai kontrak",
        data: series.map((point) => point.total),
      },
    ],
  };
}

export function SpendingValueChart({ geojson }: SpendingValueChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const series = useMemo(
    () => (geojson ? valueByYear(geojson) : []),
    [geojson],
  );
  const options = useMemo(() => chartOptions(series), [series]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || series.length === 0) return;

    if (chartRef.current) {
      chartRef.current.update(options, true, true);
      return;
    }

    chartRef.current = Highcharts.chart(container, options);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [options, series.length]);

  if (series.length === 0) {
    return (
      <div className="map-panel map-value-chart map-value-chart-empty">
        <span className="map-panel-title">Nilai kontrak per tahun</span>
        <span className="map-value-chart-empty-text">Tidak ada data</span>
      </div>
    );
  }

  return (
    <div className="map-panel map-value-chart">
      <span className="map-panel-title">Nilai kontrak per tahun</span>
      <div ref={containerRef} />
    </div>
  );
}
