# Explorer Backend Migration: Postgres (per-chain partitioned)

> Supersedes the earlier "SQLite per-chain split" idea. Decision: migrate to a
> self-hosted, tuned Postgres on the droplet with per-chain LIST partitioning.
> Canonical plan file: `.cursor/plans/postgres_migration_explorer_*.plan.md`.

## Why

One shared 58GB SQLite file with a runaway 54GB WAL caused VRM bulk indexing and
VRC reads to contend on a single writer lock, wedging `explorer-fast-api`.
Postgres gives true MVCC (readers never block the writer), COPY bulk ingest, and
per-chain physical isolation via partitioning.

## Architecture decisions

- One self-hosted Postgres 16 (Docker, on the droplet, no added cost), tuned for
  8 vCPU / 31GB.
- Every table is `PARTITION BY LIST (chain_id)` with `_vrm` / `_vrc` children, so
  VRM and VRC are physically separate while the query surface stays unified.
- `*_sats` are `BIGINT` with an `int8 -> BigInt` pg type parser (exact value math);
  0/1 flags stay `SMALLINT`; `raw_json` is not migrated (RPC fallback covers it).
- Migrate by ETL (SQLite -> Postgres via COPY), not RPC re-index.
- `VCEXP_DB_BACKEND=sqlite|postgres` selects the engine behind a unified async
  `db.get/all/run/runTransaction` interface, so cutover and rollback are config.

## Files

- `deploy/option-a/postgres/schema.sql` - partitioned parents + core tables (incl. `rollup_state`, `miner_stats`)
- `deploy/option-a/postgres/partitions.sql` - `_vrm` / `_vrc` partitions
- `deploy/option-a/postgres/indexes.sql` - secondary + BRIN indexes (post-load)
- `deploy/option-a/postgres/finalize.sh` - build indexes, ANALYZE, validate
- `deploy/option-a/postgres/backfill-block-totals.sql` - chunked, committed PL/pgSQL backfill of `fee_sats` / `total_output_sats` (fee-cap parity)
- `deploy/option-a/migrate-sqlite-to-postgres.mjs` - COPY ETL (per chain)
- `deploy/option-a/refresh-analytics-cron.sh` - single-flight (`flock`) cron tick, both chains
- `app/indexerV2/refreshAnalytics.js` - watermark-driven incremental analytics refresh
- `app/indexerV2/pgClient.js` - pg pool + unified async interface (`?`->`$n`)
- `app/indexerV2/db.js` - backend selection + SQLite unified augmentation
- `docker-compose.option-a.yml` - `postgres` service, `vericonomy-pg` volume, env

## Status (live)

Migration complete. Both chains on Postgres, all pages + charts populated, warm reads well under 2s.

Done:

- Site + indexers on Postgres (`VCEXP_DB_BACKEND=postgres`); pages < 0.3s warm.
- VRC + VRM ETL, `finalize.sh`, full async port (read/ingest/backfills/API).
- Legacy 58GB `vericonomy-index.sqlite` retired (`deploy/option-a/retire-sqlite-index.sh`).
- VRM caught up to tip; indexers run `--index-only` (analytics maintained out-of-band).
- Block totals backfilled for both chains via `backfill-block-totals.sql` -> fixes the
  `totals.* null` "Block Lookup Failed" error; web schema (`explorer-web/src/lib/api/schemas.ts`)
  also hardened to `nullable().optional()` so fresh tip blocks never fail Zod validation.
- Analytics seeded for both chains via `refreshAnalytics.js` (set-based): `chain_activity_buckets`,
  `address_period_stats`, `address_balance_buckets`, `miner_stats`.
- `network_metric_buckets`: VRM fully populated (difficulty/hashrate/supply/address_count);
  VRC difficulty + address_count populated (105.7k buckets).
- New scalability layer: `rollup_state` watermarks + `miner_stats` rollup; `getMinedLeaderboard`
  reads `miner_stats` with a live-tail fallback (VRC leaderboard intentionally gated to VRM).
- Steady state: host cron runs `refresh-analytics-cron.sh` (single-flight `flock`), advancing
  every rollup incrementally; verified tick is sub-second compute per chain.

Remaining / optional:

- VRC historical supply curve: heavy correlated-subquery series; a best-effort full pass is
  backgrounded. Leading-edge VRC supply is captured live; only the deep history is pending.
- Precompute cumulative mint for `getIndexedSupplyAtHeight` to make VRC supply backfill cheap.
