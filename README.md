# Local Governance

Government spending map dashboard — React 19 + Bun full-stack app.

## Setup

```bash
bun install
cp .env.example .env   # add MAPTILER_API_KEY from maptiler.com/cloud
```

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
src/
  index.ts              # Bun server + API routes
  index.html            # HTML shell
  frontend.tsx          # React entry (HMR)
  App.tsx               # Root component
  components/           # UI components
  index.css             # Global styles
```
