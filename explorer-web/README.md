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

Requires **explorer-api** (port 3003) for `/v1/*` data. Run the full stack from repo root:

```bash
npm run dev:full
```

Or start services separately: `npm run api:dev`, indexers, then `npm run web:dev`.

If you see hydration errors after editing components, clear the Turbopack cache:

```bash
cd explorer-web && npm run clean && npm run dev
```

## Environment

Next.js loads the repo root `.env` and `.env.local` automatically (see `next.config.ts` and `src/lib/env.ts`).

| Variable                      | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `BTCEXP_HOST` / `BTCEXP_PORT` | Used to derive API URL when `EXPLORER_API_URL` is unset |
| `BTCEXP_BASEURL`              | Optional base path prefix for API calls                 |
| `BTCEXP_UI_THEME`             | Default theme (`dark`, `light`, `system`)               |
| `EXPLORER_API_URL`            | Explicit Express backend URL override                   |
| `EXPLORER_ADMIN_TOKEN`        | Optional cookie gate for `/admin/*`                     |
| `PORT`                        | Next.js port (default 3000)                             |

All `VCEXP_*` indexer vars are consumed by the Express/indexer processes, not Next directly.

## Dev performance

The VRM address and transaction pages use **progressive loading**: SSR fetches only critical data (`getAddress` / `getTransaction`), while balance charts, UTXOs, and related activity load client-side after first paint.

Tips for faster local iteration:

- Run the full stack with `npm run dev:full` (Next uses Turbopack via `next dev --turbo`)
- Set `VCEXP_API_CACHE_TTL_MS=300000` in `.env.local` to keep explorer-api responses warm longer
- After bulk indexing, checkpoint SQLite WAL: `npm run indexer:checkpoint` (stop indexer + api first if it blocks)
- For perf testing without HMR noise: `npm run web:build && npm run web:start`

| Variable                    | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `EXPLORER_FAST_API_URL`     | Fast `/v1/*` API used by Next (default `http://127.0.0.1:3003`)           |
| `VCEXP_API_CACHE_TTL_MS`    | explorer-api in-memory cache TTL override (ms)                            |
| `VCEXP_WAL_CHECKPOINT_MB`   | Auto-checkpoint WAL when idle and WAL exceeds this size                   |
| `VCEXP_LCW_API_KEY`         | LiveCoinWatch API key for home page market data (set in repo root `.env`) |
| `VCEXP_MARKET_CACHE_TTL_MS` | Market data cache TTL in explorer-api (default 120000)                    |

The home page (`/`) uses `GET /v1/home` from explorer-api with live SSE tip updates and periodic market refresh.

## Production

```bash
npm run web:build
npm run web:start
```

Or use [`Dockerfile`](Dockerfile) with `output: "standalone"`.

See [docs/ROUTE_PARITY_MATRIX.md](../docs/ROUTE_PARITY_MATRIX.md) and [docs/CUTOVER_RUNBOOK.md](../docs/CUTOVER_RUNBOOK.md).
