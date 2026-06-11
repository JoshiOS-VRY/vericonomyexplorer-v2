# Indexer V2 API

The Indexer V2 API exposes SQLite-backed chain data separately from the legacy RPC-first explorer routes.

**Preferred:** use the lean **explorer-api** service on port **3003** (`/v1/*`). Legacy Express routes on port **3002** remain for unmigrated Pug pages only — see [LEGACY_API.md](./LEGACY_API.md).

Set `VCEXP_INDEXER_SQLITE_PATH` to the index database path before starting the indexer workers and explorer-api.

## Fast API (explorer-api :3003)

| Endpoint                             | Description                                   |
| ------------------------------------ | --------------------------------------------- |
| `GET /v1/health`                     | Service health                                |
| `GET /v1/indexer/status`             | Indexer health for all chains                 |
| `GET /v1/landing`                    | Home dashboard bundle (both chains)           |
| `GET /v1/vrm/dashboard`              | Verium explorer dashboard bundle              |
| `GET /v1/:chain/tip`                 | Live tip `{ height, hash, time }` (in-memory) |
| `GET /v1/:chain/tip/height`          | Plain-text tip height (sub-ms)                |
| `GET /v1/:chain/tip/stream`          | SSE stream of tip updates                     |
| `GET /v1/:chain/summary`             | Chain summary                                 |
| `GET /v1/:chain/richlist`            | Rich list                                     |
| `GET /v1/:chain/leaderboard`         | Leaderboard                                   |
| `GET /v1/:chain/address/:address`    | Address detail                                |
| `GET /v1/:chain/tx/:txid`            | Transaction detail                            |
| `GET /v1/:chain/block/:hashOrHeight` | Block detail                                  |
| `GET /v1/:chain/search?q=`           | Search disambiguation                         |

Next.js rewrites `/v1/*` to explorer-api. Client live data uses SSE (`/v1/:chain/tip/stream`) instead of polling legacy `/api/blocks/tip/height`.

## Legacy Status (Express :3002)

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

Response includes:

- `transaction`: block height, index, time, coinbase/coinstake flags
- `inputs`: resolved vins with `prevTxid`, `prevVout`, `value`, `resolved`
- `outputs`: vouts with spend lifecycle (`isSpent`, `spentByTxid`, `spentHeight`)
- `addressEvents`: per-address receive/spend deltas
- `totals`: `inputAtomic`, `outputAtomic`, `feeAtomic` plus display amounts
- `confirmations`: depth from chain tip when tip height is known
- `siblings`: `prevTxid` / `nextTxid` within the same block
- `changeOutputs`: output indices likely returning change to a sender address
- `trusted` and `source`: index trust labeling for UI honesty

## Block

`GET /api/indexer/:chainId/block/:hashOrHeight?limit=25&offset=0`

Returns indexed block metadata and paged transactions from that block.

Response includes:

- `block`: height, hash, previous/next hash, time, tx count, size, difficulty, `outputCount`, `extractedBy`, `extractedByAddress`
- `transactions`: paged tx list with optional `summary` (`outputCount`, `totalOutput`, `fee` for non-coinbase)
- `paging`: limit, offset, total, hasMore
- `confirmations`: depth from chain tip when tip height is known
- `coinbase`: first coinbase tx in block with `txid` and `reward`
- `totals`: block-level `fee` and `outputValue`
- `trusted` and `source`: index trust labeling for UI honesty

## Smoke Test

Run:

```bash
VCEXP_INDEXER_SQLITE_PATH=/path/to/vericonomy-index.sqlite npm run indexer:v2:query-smoke
```

The smoke test checks summary, richlist, address, transaction, and block reads against the configured SQLite database.
