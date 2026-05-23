# VeriConomy Dual Explorer Phase 1

## Goal

Build the new explorer around an honest local index before adding richlist, leaderboards, and site-facing API cards.

## Why This Phase Exists

The previous SQLite patch proves that local indexing helps resource use, but it does not fully process spends. Richlist and address balance features must be based on UTXO accounting:

```text
current balance = received outputs - spent previous outputs
```

The new `app/indexerV2` module is the replacement foundation.

## What Exists Now

- Clean dual-explorer working copy.
- VeriCoin coin config copied into the combined explorer.
- VeriCoin network assets copied into the combined explorer.
- `app/coins.js` registers BTC, VRC, and VRM.
- `app/indexerV2/schema.js` defines the V2 schema.
- `app/indexerV2/db.js` opens the V2 database and seeds VRC/VRM chain records.
- `app/indexerV2/ingest.js` indexes full block JSON into blocks, transactions, VINs, VOUTs, address events, and balances.
- `app/indexerV2/rpcClient.js` provides a standalone JSON-RPC client for dual-chain indexing.
- `app/indexerV2/worker.js` syncs a bounded block range from RPC into Indexer V2.
- `bin/indexer-v2.js` exposes the range worker from the command line.
- `app/indexerV2/smoke.js` provides a tiny local accounting smoke test.
- `configs/chains.example.json` documents dual-chain RPC configuration.

## Next Code Tasks

1. Install dependencies and run the smoke test.
2. Test small RPC ranges against VRM and VRC nodes.
3. Add unresolved-input repair pass.
4. Add reorg detection and reversal.
5. Add index-first tx lookup for Verium.
6. Add address API backed by Indexer V2.
7. Add API routes for summary, richlist, leaderboards, and indexer status.
8. Add Docker process commands for `web` and `indexer`.

## Test Commands

```bash
npm install
npm run indexer:v2:smoke
npm run indexer:v2 -- --chain vrm --start 0 --end 10
npm run indexer:v2 -- --chain vrc --start 0 --end 10
```

Before RPC range tests, copy and edit:

```bash
cp configs/chains.example.json configs/chains.json
```

## Data Rules

- Store monetary values as integer atomic units.
- Label public numbers by source: `RPC`, `index`, `external`, or `estimate`.
- Treat Verium arbitrary txid lookup as unavailable unless the local index has the transaction.
- Keep VeriCoin staking language separate from Verium mining language.

## Deployment Direction

Phase 1 should run as two processes from one image:

- `web`
- `indexer`

Both share the same SQLite volume. The web process reads; the indexer writes. Caddy remains outside the explorer compose stack on the VPS.
