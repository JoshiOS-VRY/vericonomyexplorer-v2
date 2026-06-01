# Indexer V2

This module is the new accounting foundation for the dual VeriCoin/Verium explorer.

The existing `app/sqliteDb.js` and `app/sqliteSync.js` files were useful as a prototype, but they only index outputs and do not reliably process spends. That is not good enough for richlists, address balances, or weekly/monthly leaderboards.

Indexer V2 is UTXO-first:

- store every indexed transaction,
- store every output,
- resolve every input against a previous output,
- write address events for both receives and spends,
- maintain address balances from those events,
- keep enough raw transaction JSON to render Verium transactions even when arbitrary txid RPC lookup is unavailable.

## Database Path

Default:

```text
database/vericonomy-index.sqlite
```

Override with:

```text
VCEXP_INDEXER_SQLITE_PATH=/path/to/vericonomy-index.sqlite
```

## Current Status

This pass creates the schema, seeded chain records, and the first block ingestion function that fills these tables from `getblock(hash, 2)`-style block JSON.

## Smoke Test

After dependencies are installed for this working copy:

```bash
npm run indexer:v2:smoke
```

The smoke test indexes two fixture blocks into a temporary SQLite database and prints the resulting address balances. It verifies the important accounting path: one address receives an output, a later transaction spends it, and two new outputs receive the remaining value.

## Range Sync

Create a real config from the example:

```bash
cp configs/chains.example.json configs/chains.json
```

Then edit `configs/chains.json` for RPC host/ports and set the credential environment variables it references:

```bash
export VCEXP_VRM_RPC_USER='...'
export VCEXP_VRM_RPC_PASS='...'
export VCEXP_VRC_RPC_USER='...'
export VCEXP_VRC_RPC_PASS='...'
```

Run a small bounded sync:

```bash
npm run indexer:v2 -- --chain vrm --start 0 --end 10
npm run indexer:v2 -- --chain vrc --start 0 --end 10
```

If `--start` is omitted, the worker resumes from the last indexed height in `sync_state`.

## Live Tip Sync In The Explorer

Indexer pages now call `app/indexerV2/tipSync.js` before serving chain summaries, blocks, and address history. That module:

- refreshes the RPC tip height in `sync_state`
- ingests missing blocks in small RPC chunks
- deduplicates concurrent sync requests per chain

Address pages keep syncing until they reach the RPC tip or hit the time budget. Chain and landing pages use a smaller block budget so the blocks list stays responsive.

Useful environment variables:

```text
VCEXP_TIP_SYNC_ENABLED=true
VCEXP_TIP_SYNC_MAX_BLOCKS=48
VCEXP_TIP_SYNC_ADDRESS_MAX_MS=20000
VCEXP_TIP_SYNC_CHUNK_SIZE=8
```

If RPC is unavailable, pages fall back to the last indexed state instead of failing.

## Resource Profile

The worker processes one block at a time so long backfills do not need to hold a large height range in memory. Each chain can also tune the indexer in `configs/chains.json`:

```json
"indexer": {
  "storeRawJson": false,
  "batchSize": 250,
  "pauseMs": 250
}
```

`storeRawJson` is intentionally `false` in the example config. Full RPC JSON is convenient for debugging, but it duplicates the structured accounting rows and grows quickly. Verium does not support arbitrary txid queries, so transaction pages should render from the indexed `transactions`, `vins`, `vouts`, and address event rows instead of from full raw JSON blobs.

For a very conservative VeriCoin backfill on a small VPS:

```bash
npm run indexer:v2 -- --chain vrc --batch-size 100 --pause-ms 500 --store-raw-json false
```

The CLI prints RSS and heap usage on each indexed block so the batch size can be tuned without guessing.

## Trust Status

Balances, richlists, and leaderboards are only authoritative when the index status is `trusted`. A chain becomes trusted when:

- indexing starts at height `0`,
- there are no missing block heights,
- there are no unresolved non-coinbase inputs,
- the stored sync tip matches the highest indexed block,
- the index is within the configured tip threshold of the RPC node.

Check status from the shell:

```bash
npm run indexer:v2:status
```

Or from the explorer API:

```text
/api/indexer/status
```

The status response includes source labels for UI cards. Richlist and leaderboard views should remain disabled or clearly marked until their chain reports `trusted`.

## Repair Pass

If an index starts mid-chain, or if a spend is indexed before its referenced previous output is available, the input is stored as unresolved. The repair pass only resolves those inputs when the referenced prevout exists locally:

```bash
npm run indexer:v2:repair -- --chain vrm --limit 1000
```

When repair succeeds it:

- marks the vin as resolved,
- marks the previous output spent,
- writes the missing spend event,
- updates the affected address balance.

It does not guess from RPC, and it does not make balances trusted by itself. Trust still requires a genesis-to-tip index with no gaps and no unresolved spends.

## Rollback / Reorg Recovery

If the RPC node reports a different hash for an indexed height, roll back from the first mismatched height before indexing the replacement chain:

```bash
npm run indexer:v2:rollback -- --chain vrm --from 1091600
```

Rollback removes the selected height and every indexed block after it. Before deletion, it clears spent markers created by rolled-back transactions. After deletion, it rebuilds balances for only the affected addresses and moves `sync_state` back to the last surviving block.

This is the primitive needed for automatic reorg recovery. It can also be used manually if an early test range needs to be discarded without deleting the whole database.

The range worker uses this automatically by default. If it detects that the resume tip or a height being indexed disagrees with RPC, it rolls back to the first mismatched height and continues forward on the node's current chain.

```bash
npm run indexer:v2 -- --chain vrm
```

Automatic rollback can be disabled for diagnostics:

```bash
npm run indexer:v2 -- --chain vrm --auto-rollback false
```
