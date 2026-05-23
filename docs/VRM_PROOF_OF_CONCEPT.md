# VRM Proof Of Concept

The first public explorer build should focus on Verium only. Verium is already fully indexed from genesis in compact mode, and its codebase does not reliably support arbitrary transaction queries through RPC. That makes it the best proof point for the new index-first explorer.

## Launch Scope

Include:

- Verium latest blocks and transaction summaries
- Verium block lookup from RPC or index
- Verium transaction lookup from the index
- Verium address balances from the trusted genesis index
- Verium address transaction history
- Verium richlist
- Indexer status and source labels

Defer:

- VeriCoin public richlist
- VeriCoin address history
- VeriCoin staking leaderboard
- Cross-chain dashboard cards that imply VRC and VRM have equal index readiness

VRC can remain in the codebase and config, but the public POC should label it as coming later until it has a full trusted compact index.

## Local Commands

Use the existing trusted VRM database:

```bash
export VCEXP_INDEXER_SQLITE_PATH=/Users/jay/Documents/vericonomy-index/vericonomy-index.sqlite
export VCEXP_CHAINS_CONFIG=./configs/chains.vrm-poc.example.json
```

Catch up Verium:

```bash
npm run indexer:vrm
```

Check trust:

```bash
npm run indexer:v2:status
```

Check API query reads:

```bash
npm run indexer:v2:query-smoke
```

## Deployment Shape

Run two containers or processes from the same image:

- `explorer-web`: serves the explorer UI and API
- `vrm-indexer`: runs `npm run indexer:vrm` on a loop or under a process supervisor

Both should mount the same SQLite volume. The indexer writes; the web process reads. SQLite WAL mode is enabled by the indexer DB layer.

Environment needed:

- `BTCEXP_BITCOIND_HOST`
- `BTCEXP_BITCOIND_PORT`
- `BTCEXP_BITCOIND_USER`
- `BTCEXP_BITCOIND_PASS`
- `VCEXP_INDEXER_SQLITE_PATH`
- `VCEXP_CHAINS_CONFIG`
- `VCEXP_VRM_RPC_USER`
- `VCEXP_VRM_RPC_PASS`
- optional `VCEXP_VRM_RPC_COOKIE`

Do not bake RPC credentials into the image or commit them to git.

See `configs/env.vrm-poc.example` for a local/container environment template.

## Public Honesty Rules

Show VRM richlist and address balances only when `/api/indexer/status` reports VRM as `trusted`.

For Verium transaction pages, label the source as `index-required` or `trusted-index`, not raw RPC, because the index is the reliable lookup path.

If VRC appears anywhere in the POC UI, label it as `coming later` or `not indexed yet`.
