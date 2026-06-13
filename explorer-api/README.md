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

| Variable                         | Default          | Purpose                                                |
| -------------------------------- | ---------------- | ------------------------------------------------------ |
| `VCEXP_API_DB_WORKERS`           | `min(cpus*2, 8)` | Worker-thread pool size for SQLite reads               |
| `VCEXP_API_DB_FAST_WORKERS`      | `2`              | Dedicated workers for tx/block/related-address lookups |
| `VCEXP_API_DB_WORKER_TIMEOUT_MS` | `120000`         | Worker query timeout (504 on expiry)                   |
| `VCEXP_API_SEARCH_TIMEOUT_MS`    | `15000`          | Search query worker timeout                            |
| `VCEXP_API_CACHE_TTL_MS`         | per-route        | Override all in-memory SWR cache TTLs                  |
| `VCEXP_MARKET_CACHE_TTL_MS`      | `120000`         | Market data cache TTL                                  |
| `VCEXP_SQLITE_CACHE_MB`          | `256`            | SQLite page cache per read worker (indexer + API)      |
| `VCEXP_SQLITE_MMAP_MB`           | `256`            | SQLite memory-mapped I/O size                          |
| `VCEXP_CHAIN_HEALTH_CACHE_MS`    | `60000`          | In-process chain health cache TTL                      |
| `VCEXP_FUNDED_ADDRESS_CACHE_MS`  | `60000`          | Richlist funded-address count cache                    |
| `VCEXP_WAL_CHECKPOINT_MB`        | `512`            | WAL checkpoint threshold (indexer)                     |

For local development, `VCEXP_API_CACHE_TTL_MS=300000` (5 minutes) reduces repeated cold-query latency.

### Rate limiting (abuse prevention)

Per-client limits apply to public `/v1/*` traffic. SSR and Docker-internal calls from private IPs (RFC1918, loopback) are allowlisted so Next.js server fetches are not capped as a single client.

| Variable                               | Default | Purpose                                               |
| -------------------------------------- | ------- | ----------------------------------------------------- |
| `VCEXP_RATE_LIMIT_WINDOW_MINUTES`      | `15`    | Window length; set `-1` to disable                    |
| `VCEXP_RATE_LIMIT_MAX`                 | `20000` | Max requests per IP per window                        |
| `VCEXP_RATE_LIMIT_CRAWLER_MAX`         | `800`   | Max for known crawler user-agents                     |
| `VCEXP_RATE_LIMIT_HEAVY_MAX`           | `600`   | Per-minute cap on search, richlist, utxos, etc.       |
| `VCEXP_RATE_LIMIT_SSE_MAX`             | `32`    | Concurrent `/tip/stream` connections per IP per chain |
| `VCEXP_RATE_LIMIT_ALLOW_IPS`           | —       | Extra comma-separated allowlisted IPs                 |
| `VCEXP_REDIS_URL` / `BTCEXP_REDIS_URL` | —       | Optional Redis store for multi-instance deployments   |

Legacy Express and Next.js BFF routes honor the same `VCEXP_*` / `BTCEXP_RATE_LIMIT_*` env vars where noted in `env.example`.

### Benchmarks

With explorer-api running on port 3003:

```bash
cd explorer-api
npm run bench:hotpaths
```

Optional env: `BENCH_URL`, `BENCH_DURATION`, `BENCH_CONNECTIONS`, `BENCH_CHAIN`, `BENCH_ADDRESS`, `BENCH_BLOCK`, `BENCH_TX`.

Explain query plans against the indexer database (requires `BENCH_ADDRESS` / `BENCH_TX` for address/tx plans):

```bash
cd explorer-api
npm run bench:explain
```

Schema v6+ adds partial indexes and denormalized address fields; v7 stores block `fee_sats` / `total_output_sats` and drops redundant `idx_blocks_chain_hash` (block-by-hash uses the `UNIQUE (chain_id, hash)` constraint). After upgrading, run migrations via indexer startup or open the DB with indexer V2, then backfill stats if needed.

Live polling uses `GET /v1/:chain/summary/lite` (blocks + health only). On each new block tip, the API refreshes the full summary once and seeds the latest-blocks cache from that result.

### Indexer stats backfill

After upgrading schema (balance/activity buckets), backfill materialized stats for existing indexed data:

```bash
# From repo root — stop indexer first if database is busy
node app/indexerV2/backfillStats.js
node app/indexerV2/backfillStats.js vrm   # single chain
```

### Insights network metrics / address growth

Historical difficulty/supply/hashrate buckets (optional `--since` unix timestamp):

```bash
npm run indexer:backfill-network-metrics -- --chain vrm
```

Historical **address growth** only (fast; uses `address_balances.first_seen_time`, skips schema v6/v7 backfills):

```bash
npm run indexer:backfill-address-growth -- --chain vrm
npm run indexer:backfill-address-growth -- --chain vrc
npm run indexer:backfill-address-growth -- --chain vrm --since $(date -d '365 days ago' +%s)
```

**Chain activity** buckets (Insights “Chain activity” chart):

```bash
# Stop indexer + explorer-api first on production to avoid SQLite lock contention
npm run indexer:backfill-stats -- vrm
npm run indexer:backfill-stats -- vrc
```

Progress logs to stderr in batches (default 5,000 rows). Tune with `VCEXP_BACKFILL_STATS_BATCH_SIZE`.

**Chain activity** (`chain_activity_buckets`) is populated during the transactions/blocks phases, which run first. The long address-events phase fills `address_balance_buckets` only.

**Production Docker (option-a):** see `deploy/option-a/backfill-vrc-insights.sh` and `backfill-vrm-insights.sh` for full per-chain scripts.

The indexer loop runs `maybeCheckpointWal()` when caught up and the WAL file exceeds `VCEXP_WAL_CHECKPOINT_MB` (default `512` MB). Manual checkpoint:

```bash
# Stop indexer + api if checkpoint blocks on a busy database
npm run indexer:checkpoint
```

## Reliability

- Global error handler maps worker timeouts to **504**, validation errors to **400**, with `requestId` on all error responses.
- Market/network failures degrade gracefully (partial payloads, stale market fallback).
- Worker slots respawn automatically on crash; idempotent reads retry once.
