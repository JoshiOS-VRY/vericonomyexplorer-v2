# VeriConomy Explorer Web (Next.js + Tailwind)

Next.js frontend for the VeriConomy dual-chain explorer. Uses Verium design tokens and consumes the Express `/api/*` backend.

## Development

### Full stack (recommended)

From the repo root, with shared `.env` / `.env.local`:

```bash
npm install
npm --prefix explorer-web install
npm run dev:full
```

This starts:
- Express API (`npm start`) on `BTCEXP_PORT` (default 3002)
- VRM indexer worker (`npm run indexer:vrm`)
- Next.js UI on port 3000

### UI only

```bash
cd explorer-web
npm run dev
```

Requires Express API already running at `EXPLORER_API_URL` or `BTCEXP_HOST:BTCEXP_PORT`.

## Environment

Next.js loads the repo root `.env` and `.env.local` automatically (see `next.config.ts` and `src/lib/env.ts`).

| Variable | Description |
|---|---|
| `BTCEXP_HOST` / `BTCEXP_PORT` | Used to derive API URL when `EXPLORER_API_URL` is unset |
| `BTCEXP_BASEURL` | Optional base path prefix for API calls |
| `BTCEXP_UI_THEME` | Default theme (`dark`, `light`, `system`) |
| `EXPLORER_API_URL` | Explicit Express backend URL override |
| `EXPLORER_ADMIN_TOKEN` | Optional cookie gate for `/admin/*` |
| `PORT` | Next.js port (default 3000) |

All `VCEXP_*` indexer vars are consumed by the Express/indexer processes, not Next directly.

## Production

```bash
npm run web:build
npm run web:start
```

Or use [`Dockerfile`](Dockerfile) with `output: "standalone"`.

See [docs/ROUTE_PARITY_MATRIX.md](../docs/ROUTE_PARITY_MATRIX.md) and [docs/CUTOVER_RUNBOOK.md](../docs/CUTOVER_RUNBOOK.md).
