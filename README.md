# MapTheBudget

Government spending map dashboard — React 19 + Bun full-stack app.

## Setup

```bash
bun install
cp .env.example .env   # add MAPTILER_API_KEY from maptiler.com/cloud
```

The app reads **cleaned JSON** from `data/spending/`. Those files are committed and ready to use — you can run the dashboard without any SQLite file.

To regenerate the JSON from source data, place the raw database at `data/raw/bali-inaproc-2025.sqlite` (gitignored) and run:

```bash
bun run extract:spending
```

## Data

| Path | Role |
|------|------|
| `data/raw/*.sqlite` | Raw source exports (local only, not in git) |
| `data/spending/*.json` | Cleaned, map-ready spending data (committed) |
| `scripts/extract-spending-by-region.ts` | Raw SQLite → per-region JSON |

The extract script reads the `realisasi`, `instansi`, and `satker` tables, ranks packages by value per region, and writes one JSON file per Bali regency/city plus `index.json`.

## Development

```bash
bun dev
```

Opens at http://localhost:3000 with HMR.

## Production

```bash
bun run build   # static assets → dist/
bun start       # production server
```

## Structure

```
data/
  raw/                  # raw SQLite (local, gitignored)
  spending/             # cleaned JSON consumed by the app
scripts/
  extract-spending-by-region.ts
src/
  index.ts              # Bun server + API routes
  index.html            # HTML shell
  frontend.tsx          # React entry (HMR)
  App.tsx               # Root component
  components/           # UI components
  lib/                  # spending loaders, GeoJSON helpers
  index.css             # Global styles
api/                    # Vercel serverless route handlers
```
