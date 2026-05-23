# Indexer V2 API

The Indexer V2 API exposes SQLite-backed chain data separately from the legacy RPC-first explorer routes. The first proof-of-concept launch should use these endpoints for Verium only. VeriCoin can use the same API after it has a trusted compact index.

Set `VCEXP_INDEXER_SQLITE_PATH` to the index database path before starting the explorer.

## Status

`GET /api/indexer/status`

Returns health for every configured chain. For the proof-of-concept, the public UI should only enable Verium index-backed features when VRM returns:

- `status: "trusted"`
- `checks.startsAtGenesis: true`
- `checks.noHeightGaps: true`
- `checks.noUnresolvedSpends: true`
- `checks.nearTip: true`

## Chain Summary

`GET /api/indexer/:chainId/summary`

Returns chain health, latest indexed blocks, and recent indexed transactions.

Example:

`GET /api/indexer/vrm/summary`

## Richlist

`GET /api/indexer/:chainId/richlist?limit=25&offset=0`

Returns positive-balance addresses ordered by balance. Richlist is disabled unless the chain is trusted, unless `allowUntrusted=true` is supplied for development.

Example:

`GET /api/indexer/vrm/richlist?limit=50`

## Leaderboard

`GET /api/indexer/:chainId/leaderboard?period=week&sort=net&limit=25&offset=0`

Returns indexed address transfer activity for the current UTC week or month.

Supported periods:

- `week`
- `month`

Supported sorts:

- `net`
- `received`
- `sent`
- `activity`

This is transfer activity derived from indexed address deltas. It should not be described as mining, staking, identity, or ownership activity unless additional verified labels are added later.

## Address

`GET /api/indexer/:chainId/address/:address?limit=25&offset=0`

Returns indexed balance totals and paged transaction history for one address.

Amounts are returned in two forms:

- `balanceAtomic`, `totalReceivedAtomic`, `totalSentAtomic`: exact integer atomic units as strings
- `balance`, `totalReceived`, `totalSent`: display object with decimal amount and ticker

## Transaction

`GET /api/indexer/:chainId/tx/:txid`

Returns indexed transaction metadata, resolved inputs, outputs, and address delta events. This is the preferred lookup path for Verium because arbitrary transaction lookup through RPC is not reliable in the current Verium codebase.

## Block

`GET /api/indexer/:chainId/block/:hashOrHeight?limit=25&offset=0`

Returns indexed block metadata and paged transactions from that block.

## Smoke Test

Run:

```bash
VCEXP_INDEXER_SQLITE_PATH=/path/to/vericonomy-index.sqlite npm run indexer:v2:query-smoke
```

The smoke test checks summary, richlist, address, transaction, and block reads against the configured SQLite database.
