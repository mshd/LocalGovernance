import Papa from "papaparse";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRCW_6YObCkJhZsp8CooIOfZLrxhrj3GqiO8RsgRX0k7Z3AfhtBdRsNZs-F-ELmNEpUccerlJW4-r9s/pub?gid=844077698&single=true&output=csv";

const CACHE_TTL_MS = 5 * 60 * 1000;

export type SheetCoordinate = {
  lat: number;
  lng: number;
};

type SheetRow = {
  id?: string;
  coordinates?: string;
};

type CacheEntry = {
  fetchedAt: number;
  byId: Map<number, SheetCoordinate>;
};

let cache: CacheEntry | null = null;
let inflight: Promise<Map<number, SheetCoordinate>> | null = null;

function parseCoordinatePart(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?$/i);
  if (!match) {
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }

  let value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const direction = match[2]?.toUpperCase();
  if (direction === "S" || direction === "W") {
    value = -Math.abs(value);
  } else if (direction === "N" || direction === "E") {
    value = Math.abs(value);
  }

  return value;
}

function parseCoordinates(raw: string): SheetCoordinate | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;

  const lat = parseCoordinatePart(parts[0]!);
  const lng = parseCoordinatePart(parts[1]!);
  if (lat == null || lng == null) return null;

  return { lat, lng };
}

function csvToMap(csv: string): Map<number, SheetCoordinate> {
  const parsed = Papa.parse<SheetRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0]?.message ?? "unknown error"}`);
  }

  const byId = new Map<number, SheetCoordinate>();

  for (const row of parsed.data) {
    const id = Number(row.id?.trim());
    if (!Number.isFinite(id)) continue;

    const coords = parseCoordinates(row.coordinates ?? "");
    if (!coords) continue;

    byId.set(id, coords);
  }

  return byId;
}

async function fetchSheetCoordinates(): Promise<Map<number, SheetCoordinate>> {
  const url = process.env.SHEET_COORDINATES_URL ?? DEFAULT_SHEET_URL;
  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    throw new Error(`Sheet fetch failed: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  return csvToMap(csv);
}

export async function loadSheetCoordinates(): Promise<Map<number, SheetCoordinate>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.byId;
  }

  if (inflight) return inflight;

  inflight = fetchSheetCoordinates()
    .then((byId) => {
      cache = { fetchedAt: Date.now(), byId };
      return byId;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
