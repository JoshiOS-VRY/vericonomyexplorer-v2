# RPC reindex parity test (isolated Postgres)

Validates whether production balances differ from a **fresh RPC index from height 0**
without touching `vericonomy-postgres`, indexers, or chain nodes.

## What runs where

| Component | Production | Parity test |
|-----------|------------|-------------|
| Postgres | `vericonomy-postgres` / `vericonomy` | `vericonomy-postgres-reindex` / `vericonomy_reindex` |
| Volume | `vericonomy-pg` | `vericonomy-pg-reindex` |
| Indexer | `vericonomy-vrm-indexer` (unchanged) | `vericonomy-vrm-reindex-worker` (one-shot) |
| Nodes | Host `veriumd` / `vericoind` (read-only RPC) | Same RPC — not modified |

Ingest uses **`--index-only`**: blocks, txs, vins/vouts, `address_events`, `address_balances` only (no insights buckets).

## Quick start (VRM — required for `VEeDx…` address)

On the explorer VPS, from repo root:

```bash
chmod +x deploy/option-a/reindex-parity/*.sh
bash deploy/option-a/reindex-parity/start-vrm.sh
docker logs -f vericonomy-vrm-reindex-worker
```

When caught up (or to check progress):

```bash
bash deploy/option-a/reindex-parity/compare-address.sh VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176
```

## Optional: VRC full reindex

After VRM completes (same DB, different `chain_id` partition):

```bash
docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml \
  --env-file .env.production --profile reindex-parity \
  run -d --name vericonomy-vrc-reindex-worker vrc-reindex-worker
```

VRC is ~7M blocks; expect days.

## Interpreting `compare-address` output

- **`delta.balance` > 0** (reindex higher): production is missing receives — supports legacy SQLite/ETL or ingest gap, not “display bug”.
- **`delta.balance` ≈ 0**: production matches RPC rebuild for this address; wallet vs explorer is likely wallet-wide UI or different node.
- **`reindex.found: false`**: worker still running or not reached address activity height yet.

## Teardown (reclaim disk)

```bash
docker rm -f vericonomy-vrm-reindex-worker vericonomy-vrc-reindex-worker
docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml \
  --env-file .env.production --profile reindex-parity down
docker volume rm vericonomyexplorer-v2_vericonomy-pg-reindex 2>/dev/null || true
```
