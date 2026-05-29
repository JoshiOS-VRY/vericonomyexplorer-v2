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
- `GET /v1/home/shell` — indexed landing data only (cached ~30s)
- `GET /v1/home/network` — RPC network stats (cached ~30s, refreshed on new blocks)
- `GET /v1/home/market` — market-only refresh for client polling (cached ~120s)

Market data is fetched server-side from LiveCoinWatch (`VCEXP_LCW_API_KEY`) with optional CoinGecko BTC reference (`VCEXP_COINGECKO_API_KEY`).

## Performance

SQLite reads run in a worker pool (default **4** workers, capped by CPU count) so concurrent `/v1/*` requests do not block the Fastify event loop. Indexed queries use readonly worker connections; live RPC enrichment runs on the main thread after worker DB reads complete.

### Tuning environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VCEXP_API_DB_WORKERS` | `min(cpus, 4)` | Worker-thread pool size for SQLite reads |
| `VCEXP_API_DB_WORKER_TIMEOUT_MS` | `60000` | Worker query timeout (504 on expiry) |
| `VCEXP_API_SEARCH_TIMEOUT_MS` | `15000` | Search query worker timeout |
| `VCEXP_API_CACHE_TTL_MS` | per-route | Override all in-memory SWR cache TTLs |
| `VCEXP_MARKET_CACHE_TTL_MS` | `120000` | Market data cache TTL |
| `VCEXP_WAL_CHECKPOINT_MB` | `512` | WAL checkpoint threshold (indexer) |

For local development, `VCEXP_API_CACHE_TTL_MS=300000` (5 minutes) reduces repeated cold-query latency.

### Benchmarks

With explorer-api running on port 3003:

```bash
cd explorer-api
npm run bench:hotpaths
```

Optional env: `BENCH_URL`, `BENCH_DURATION`, `BENCH_CONNECTIONS`, `BENCH_CHAIN`, `BENCH_ADDRESS`, `BENCH_BLOCK`, `BENCH_TX`.

### Indexer stats backfill

After upgrading schema (balance/activity buckets), backfill materialized stats for existing indexed data:

```bash
# From repo root — stop indexer first if database is busy
node app/indexerV2/backfillStats.js
node app/indexerV2/backfillStats.js vrm   # single chain
```

The indexer loop runs `maybeCheckpointWal()` when caught up and the WAL file exceeds `VCEXP_WAL_CHECKPOINT_MB` (default `512` MB). Manual checkpoint:

```bash
# Stop indexer + api if checkpoint blocks on a busy database
npm run indexer:checkpoint
```

## Reliability

- Global error handler maps worker timeouts to **504**, validation errors to **400**, with `requestId` on all error responses.
- Market/network failures degrade gracefully (partial payloads, stale market fallback).
- Worker slots respawn automatically on crash; idempotent reads retry once.
