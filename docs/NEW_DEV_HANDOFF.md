# VeriConomy Dual Explorer Handoff

Prepared for the next VeriConomy explorer developer.

## Executive Summary

This project is a new dual-chain explorer foundation for VeriCoin (VRC) and Verium (VRM). It started from `btc-rpc-explorer`, but the direction is to move away from the old Bitcoin-oriented presentation and toward a VeriConomy-native explorer with a modern card-based UI, source-labeled data, and a compact local index for features the nodes do not provide directly.

The first public proof of concept should focus on Verium. Verium has the sharpest need for an index-first explorer because its codebase does not reliably support arbitrary transaction queries through RPC. Address pages, balances, transaction pages, richlists, and weekly/monthly leaderboards need a trusted genesis-to-tip index rather than ad hoc RPC guesses.

VeriCoin remains part of the architecture and config, but it should be enabled publicly only after it has the same trusted index coverage. VRC is resource heavier, so its indexer settings should be conservative and its node config should use a practical `dbcache` value on small VPS hosts.

## Product Direction

The explorer should eventually become the chain-data side of the larger VeriConomy site. The site explains; the explorer proves.

Primary goals:

- A dual explorer landing page for VRC and VRM.
- A full Verium proof-of-concept explorer first.
- A plug-in-ready VRC path for a later release.
- Honest source labeling for every important number.
- Compact SQLite indexing for address balances, address history, richlists, and leaderboards.
- A modern frontend that visually belongs with the new VeriConomy website.
- Easy deployment behind Caddy on a Docker-only VPS.

Non-goals for the first proof of concept:

- Publicly claiming VRC richlist/address support before a trusted VRC index exists.
- Exposing RPC directly to the public web.
- Treating external market/API data as equivalent to node or local index data.
- Shipping the generated SQLite database in Git.

## Current State

Important completed pieces:

- The working project is named `vericonomy-dual-explorer`.
- `package.json` has been renamed and metadata points toward VeriConomy.
- VeriCoin and Verium coin configs/assets exist under `app/coins/` and `public/img/network-*`.
- New VeriConomy assets exist under `public/img/vericonomy/`.
- The project has a new Indexer V2 foundation in `app/indexerV2/`.
- Indexer V2 stores normalized block, transaction, input, output, address event, and balance data.
- Indexer V2 has trust/status checks, repair, rollback, and reorg recovery primitives.
- API routes exist under `/api/indexer/...`.
- UI routes exist under `/`, `/vrm`, `/vrm/richlist`, `/vrm/leaderboard`, `/vrm/address/:address`, `/vrm/tx/:txid`, and `/vrm/block/:hashOrHeight`.
- The proof-of-concept frontend exists in `views/indexer/`.
- Verium is the intended first release target.

Important incomplete pieces:

- The remaining btc-rpc-explorer visual/layout conventions should be removed over time.
- Docker/compose should be modernized into separate `web` and `indexer` services.
- The public VRC explorer should stay disabled or clearly labeled until VRC indexing is trusted.
- Install/setup scripting should be improved so a new server can be configured by prompts.
- Leaderboard definitions need final product decisions before public launch.
- Tune public API rate limits (`VCEXP_RATE_LIMIT_*` in `.env`) and optional edge limits in Caddy/nginx for your traffic profile.

## Repository Map

Key files and folders:

```text
app.js                         Express application entry
bin/www                        web server boot
bin/indexer-v2.js              indexer worker CLI
bin/indexer-status.js          index trust/status CLI
bin/indexer-repair.js          unresolved-input repair CLI
bin/indexer-rollback.js        manual rollback CLI
app/indexerV2/                 compact local indexing system
routes/apiRouter.js            API routes, including /api/indexer/*
routes/indexerPageRouter.js    new VeriConomy explorer page routes
views/indexer/                 new Pug templates for explorer proof of concept
public/img/vericonomy/         VeriConomy visual assets for explorer UI
configs/chains.example.json    dual-chain config template
configs/chains.vrm-poc.example.json
configs/env.vrm-poc.example
database/                      runtime SQLite volume, do not commit generated DBs
Dockerfile
docker-compose.yml             legacy single-service compose, needs next pass
docs/                          implementation notes and handoff docs
```

## Architecture

The project currently has two explorer layers:

- Legacy btc-rpc-explorer behavior for existing node/block pages.
- New VeriConomy indexer routes and UI for chain summary, richlist, leaderboard, address, transaction, and block views.

The new system should become the primary public explorer. The local SQLite index is the accounting authority for address-oriented features. RPC is still used for node status, tip height, block fetches during indexing, and legacy pages where applicable.

Recommended production shape:

```text
Caddy
  -> explorer-web container
       reads SQLite index
       serves UI and public /api/indexer routes

  -> no public access to RPC ports

indexer container or process
  -> talks to VRM/VRC nodes over private network
  -> writes SQLite index
  -> runs chains sequentially with conservative pause/batch settings

SQLite volume
  -> shared by web and indexer
```

The indexer should run sequentially across chains, not concurrently, unless the host has been sized for that. This matters most for VeriCoin.

## Data Honesty Rules

These rules are part of the product, not just implementation preference:

- Address balances must be derived from a genesis-to-tip index.
- Richlists must use indexed balances only when the chain is trusted.
- Weekly/monthly leaderboards must be derived from indexed address events.
- Verium transaction lookup should be labeled as index-backed because arbitrary txid RPC lookup is not reliable.
- Public UI should label important numbers as `RPC`, `trusted index`, `external`, or `estimate`.
- VRC and VRM should not be presented as having identical data readiness until both indexes are trusted.
- No balance should be guessed from partial history.

Trust currently means:

- indexing started at height `0`,
- no missing block heights,
- no unresolved non-coinbase inputs,
- the stored sync tip matches the highest indexed block,
- the index is close enough to the node tip.

## Local Setup

Prerequisites:

- Node.js 20 or newer.
- npm.
- A synced Verium node for VRM proof of concept.
- A synced VeriCoin node when VRC indexing is ready.
- SQLite support through the bundled `better-sqlite3` dependency.

Install dependencies:

```bash
npm ci
```

Create local chain config:

```bash
cp configs/chains.example.json configs/chains.json
```

Set RPC credentials with environment variables. Do not commit real credentials:

```bash
export VCEXP_VRM_RPC_USER='replace-me'
export VCEXP_VRM_RPC_PASS='replace-me'
export VCEXP_VRC_RPC_USER='replace-me'
export VCEXP_VRC_RPC_PASS='replace-me'
```

For the VRM proof of concept, use:

```bash
export VCEXP_INDEXER_SQLITE_PATH=database/vericonomy-index.sqlite
export VCEXP_CHAINS_CONFIG=./configs/chains.vrm-poc.example.json
export BTCEXP_HOST=127.0.0.1
export BTCEXP_PORT=3002
export BTCEXP_BITCOIND_HOST=127.0.0.1
export BTCEXP_BITCOIND_PORT=33987
export BTCEXP_BITCOIND_USER='replace-me'
export BTCEXP_BITCOIND_PASS='replace-me'
```

Run the web app:

```bash
npm start
```

Run smoke tests:

```bash
npm run indexer:v2:smoke
npm run indexer:v2:query-smoke
npm run indexer:v2:repair-smoke
npm run indexer:v2:rollback-smoke
npm run indexer:v2:reorg-smoke
```

Run a small VRM indexing range:

```bash
npm run indexer:v2 -- --chain vrm --start 0 --end 10
```

Resume VRM indexing:

```bash
npm run indexer:vrm
```

Check index status:

```bash
npm run indexer:v2:status
```

## Docker Setup Direction

The current `docker-compose.yml` is still closer to the older single Verium explorer setup. The next dev should split it into at least:

- `explorer-web`: runs `npm start`.
- `vrm-indexer`: runs `npm run indexer:vrm` or a supervisor loop.
- later `vrc-indexer`: runs a conservative VRC index job when ready.

Both web and indexer services should mount the same database volume. RPC credentials should be passed through `.env` or Docker secrets and never committed.

Recommended production env concepts:

```text
BTCEXP_HOST=0.0.0.0
BTCEXP_PORT=3002
VCEXP_INDEXER_SQLITE_PATH=/data/vericonomy-index.sqlite
VCEXP_CHAINS_CONFIG=/app/configs/chains.vrm-poc.example.json
VCEXP_VRM_RPC_USER=...
VCEXP_VRM_RPC_PASS=...
BTCEXP_BITCOIND_HOST=vrm-node-or-private-ip
BTCEXP_BITCOIND_PORT=33987
BTCEXP_BITCOIND_USER=...
BTCEXP_BITCOIND_PASS=...
```

Caddy should terminate TLS and reverse proxy to the web container only. RPC ports and SQLite volumes should never be publicly reachable.

## Node Resource Notes

VeriCoin is known to be resource hungry on smaller hosts. Use conservative settings:

- Set a practical `dbcache` in the VeriCoin node config.
- Keep RPC concurrency low.
- Run chain indexers sequentially.
- Use small indexer batches and pauses for VRC.
- Avoid storing full raw JSON unless debugging requires it.

Example conservative VRC index command:

```bash
npm run indexer:v2 -- --chain vrc --batch-size 100 --pause-ms 500 --store-raw-json false
```

For VRM, compact mode is expected:

```json
{
  "storeRawJson": false,
  "batchSize": 500,
  "pauseMs": 100
}
```

## Public API

Indexer API routes:

```text
GET /api/indexer/status
GET /api/indexer/:chainId/summary
GET /api/indexer/:chainId/richlist
GET /api/indexer/:chainId/leaderboard
GET /api/indexer/:chainId/address/:address
GET /api/indexer/:chainId/tx/:txid
GET /api/indexer/:chainId/block/:hashOrHeight
```

The WordPress/site side should consume only these public API routes or a future narrowed bridge endpoint. It should never connect directly to RPC or SQLite.

## Frontend Direction

The current proof-of-concept frontend is intentionally only a start. Desired direction:

- Match the VeriConomy website visual language.
- Use modular dense cards.
- Center dual-chain summaries on the landing page.
- Keep VRC clearly disabled or "coming later" until trusted.
- Use correct Verium, VeriCoin, and VeriConomy assets.
- Replace btc-rpc-explorer chrome with VeriConomy-native navigation.
- Show source labels near data users may rely on.

Relevant current assets:

```text
public/img/vericonomy/vericoin-logo.svg
public/img/vericonomy/verium-logo.svg
public/img/vericonomy/binary-chain-icon.svg
public/img/vericonomy/binary-chain-pairing.png
```

## Security Checklist

Before public launch:

- Do not commit `.env`, `configs/chains.json`, RPC passwords, or generated SQLite databases.
- Keep nodes and RPC ports private.
- Put the explorer behind Caddy with HTTPS.
- Public API rate limiting is enabled on `explorer-api` (`/v1/*`), Next.js BFF (`/api/rpc`, `/api/internal`, etc.), and legacy Express; tune `VCEXP_RATE_LIMIT_*` before launch.
- Consider separate read-only public API routes from internal admin/debug routes.
- Disable or protect any admin/status pages that expose filesystem paths, node details, or credentials.
- Run containers as non-root.
- Mount the SQLite database as a named Docker volume, not inside the image.
- Keep Node and npm dependencies patched.
- Use Dependabot or another scheduled dependency review once the GitHub repo is active.

## GitHub Packaging Notes

Include in Git:

- Source code.
- Pug templates.
- public assets.
- config examples.
- Docker files.
- docs.
- package lock/shrinkwrap files.

Do not include in Git:

- `.git/`
- `node_modules/`
- `.env`
- `configs/chains.json`
- `database/*.sqlite`
- `database/*.db`
- cache/log files
- local OS files such as `.DS_Store`

## Suggested Next Tasks

1. Create a clean GitHub repo and push the packaged source.
2. Confirm no secrets are present in history.
3. Replace the current Docker compose with separate web/indexer services.
4. Run all indexer smoke tests on the new dev machine.
5. Wire a local VRM node and run a small height range.
6. Point the web app at the existing trusted VRM index if available.
7. Finish the VeriConomy-native frontend pass.
8. Add a setup script that prompts for chain, RPC host, RPC port, credentials, public hostname, Caddy mode, and database volume path.
9. Add production Caddy examples.
10. Add a VRC indexing plan after VRM proof of concept is stable.
