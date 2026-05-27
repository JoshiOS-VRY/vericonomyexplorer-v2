# explorer-api

Fast lean API for the VeriConomy block explorer (port **3003**).

## Requirements

- **Use the same Node.js version** as the repo root (indexers + legacy Express). Native `better-sqlite3` is loaded from the repo root `node_modules`.
- Verium / VeriCoin RPC nodes reachable per `configs/chains.json`.

## Setup

```bash
# From repo root — rebuild native module for your Node version
# Stop indexer workers first if rebuild reports EBUSY/EPERM
npm run api:rebuild-native

npm run api:dev
```

If you see `ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION` mismatch:

1. Check `node -v` in the terminal running `api:dev`
2. Stop `npm run indexer:vrm` / `indexer:vrc` (they lock the `.node` file)
3. Run `npm rebuild better-sqlite3` at repo root
4. Restart indexers and `npm run api:dev`

## Endpoints

See [docs/INDEXER_V2_API.md](../docs/INDEXER_V2_API.md) — all `/v1/*` routes.

Home dashboard data (market + network stats + summaries):

- `GET /v1/home` — full home payload (cached ~30s)
- `GET /v1/home/market` — market-only refresh for client polling (cached ~120s)

Market data is fetched server-side from LiveCoinWatch (`VCEXP_LCW_API_KEY`) with optional CoinGecko BTC reference (`VCEXP_COINGECKO_API_KEY`).

## Performance

SQLite reads run in a small worker pool (`VCEXP_API_DB_WORKERS`, default `2`) so concurrent `/v1/*` requests do not block each other on the main event loop.

In-memory route caches honor `VCEXP_API_CACHE_TTL_MS` when set (default per-route TTL otherwise). For local development, `300000` (5 minutes) reduces repeated cold-query latency.

The indexer loop runs `maybeCheckpointWal()` when caught up and the WAL file exceeds `VCEXP_WAL_CHECKPOINT_MB` (default `512` MB). Manual checkpoint:

```bash
# Stop indexer + api if checkpoint blocks on a busy database
npm run indexer:checkpoint
```
