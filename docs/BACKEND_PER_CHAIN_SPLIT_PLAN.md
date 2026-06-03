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

- `deploy/option-a/postgres/schema.sql` - partitioned parents + core tables
- `deploy/option-a/postgres/partitions.sql` - `_vrm` / `_vrc` partitions
- `deploy/option-a/postgres/indexes.sql` - secondary + BRIN indexes (post-load)
- `deploy/option-a/postgres/finalize.sh` - build indexes, ANALYZE, validate
- `deploy/option-a/migrate-sqlite-to-postgres.mjs` - COPY ETL (per chain)
- `app/indexerV2/pgClient.js` - pg pool + unified async interface (`?`->`$n`)
- `app/indexerV2/db.js` - backend selection + SQLite unified augmentation
- `docker-compose.option-a.yml` - `postgres` service, `vericonomy-pg` volume, env

## Status (live)

Done:
- Site + indexers on Postgres (`VCEXP_DB_BACKEND=postgres`); pages < 0.3s.
- VRC + VRM ETL, `finalize.sh`, full async port (read/ingest/backfills/API).
- Legacy 58GB `vericonomy-index.sqlite` retired (`deploy/option-a/retire-sqlite-index.sh`).

In progress:
- VRM catch-up to tip on Postgres.
- VRC/VRM `backfillStats` (chain activity + leaderboards) in background.

Optional later:
- Network-metric + address-growth backfills for insights charts.
- Precompute cumulative mint for `getIndexedSupplyAtHeight`.
