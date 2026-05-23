# VeriConomy Explorer V2

Open-source, self-hosted explorer foundation for the VeriConomy dual-chain ecosystem: VeriCoin (VRC) and Verium (VRM).

This project is being rebuilt as a VeriConomy-native explorer with modern UI, honest source labeling, and a compact local index for chain data that cannot be served reliably by RPC alone.

## Project Status

This repository is an active handoff/buildout for the next VeriConomy explorer.

Current direction:

- Launch Verium (VRM) first as the proof of concept.
- Keep VeriCoin (VRC) wired into the architecture for a later public release.
- Use a compact SQLite index for address balances, address history, richlists, leaderboards, and Verium transaction lookup.
- Replace the inherited explorer presentation with a VeriConomy-native card-based interface.
- Keep every public number honest by labeling whether it came from RPC, the trusted local index, an external source, or an estimate.

The project began from the spirit of a self-hosted RPC explorer, but it is no longer intended to present itself as a Bitcoin explorer or a generic upstream clone.

## Why Indexing Matters

Verium does not reliably support arbitrary transaction queries through RPC. That means transaction pages, address history, balances, richlists, and leaderboards must come from a trusted local index.

For these features to be honest, the index needs to process the chain from genesis:

```text
current balance = received outputs - spent previous outputs
```

The new Indexer V2 layer is built around that accounting model. It stores normalized blocks, transactions, inputs, outputs, address events, and balances instead of relying on incomplete lookup paths.

## Features In Progress

- Dual-chain landing page for VRC and VRM.
- Verium block, transaction, address, richlist, and leaderboard pages.
- Index-backed Verium transaction lookup.
- Chain status and trust reporting.
- Public indexer API routes.
- Compact SQLite storage.
- Repair and rollback tools for unresolved inputs and reorg handling.
- Docker-oriented deployment path.
- Future VRC plug-in path with conservative indexing settings.

## Repository Map

```text
app.js                         Express application entry
bin/www                        web server boot
bin/indexer-v2.js              indexer worker CLI
bin/indexer-status.js          index status CLI
bin/indexer-repair.js          unresolved-input repair CLI
bin/indexer-rollback.js        rollback/reorg recovery CLI
app/indexerV2/                 compact local indexing system
routes/apiRouter.js            public API routes, including /api/indexer/*
routes/indexerPageRouter.js    new VeriConomy explorer page routes
views/indexer/                 new explorer proof-of-concept templates
public/img/vericonomy/         VeriConomy visual assets
configs/                       chain and environment examples
docs/NEW_DEV_HANDOFF.md        full technical handoff for new developers
```

## Getting Started

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

For the Verium proof of concept:

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

By default, the local app is expected at:

```text
http://127.0.0.1:3002/
```

## Indexer Commands

Run smoke tests:

```bash
npm run indexer:v2:smoke
npm run indexer:v2:query-smoke
npm run indexer:v2:repair-smoke
npm run indexer:v2:rollback-smoke
npm run indexer:v2:reorg-smoke
```

Run a small Verium range:

```bash
npm run indexer:v2 -- --chain vrm --start 0 --end 10
```

Resume Verium indexing:

```bash
npm run indexer:vrm
```

Check trust/status:

```bash
npm run indexer:v2:status
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

The VeriConomy website should consume these public API routes or a future narrowed bridge endpoint. It should never connect directly to RPC or SQLite.

## Deployment Direction

Recommended production shape:

```text
Caddy
  -> explorer web container

private network
  -> Verium/VeriCoin nodes
  -> indexer process/container

shared SQLite volume
  -> web reads
  -> indexer writes
```

The next Docker pass should split the app into separate services:

- `explorer-web`: runs `npm start`.
- `vrm-indexer`: runs Verium indexing.
- later `vrc-indexer`: runs conservative VeriCoin indexing when ready.

Do not expose node RPC ports to the public internet.

## Security Notes

Do not commit:

- `.env`
- `configs/chains.json`
- RPC credentials
- generated SQLite databases
- cache/log output
- `node_modules`

Keep Caddy as the public TLS entry point. Keep RPC, database files, and any admin/debug surfaces private or protected.

## Developer Handoff

Start here:

[docs/NEW_DEV_HANDOFF.md](docs/NEW_DEV_HANDOFF.md)

Additional docs:

- [docs/VERICONOMY_DUAL_EXPLORER_PHASE_1.md](docs/VERICONOMY_DUAL_EXPLORER_PHASE_1.md)
- [docs/VRM_PROOF_OF_CONCEPT.md](docs/VRM_PROOF_OF_CONCEPT.md)
- [docs/INDEXER_V2_API.md](docs/INDEXER_V2_API.md)
- [app/indexerV2/README.md](app/indexerV2/README.md)

## License

MIT. See [LICENSE](LICENSE).
