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
- **`delta.balance` ≈ 0**: production matches RPC rebuild for this address; wallet vs explorer is **not** explained by SQLite→Postgres migration alone — investigate ingest attribution (e.g. vouts with pubkey in `asm` but no `scriptPubKey.address`) or wallet scope.
- **`reindex.found: false`**: worker still running or has not reached address activity height yet.

After VRM reindex completes:

```bash
bash deploy/option-a/reindex-parity/parity-report.sh VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176 65469.93
```

## Result (2026-06-03, `VEeDx…`)

Full RPC reindex to height **1,100,575** matched production exactly:

| Field | Value (VRM) |
|-------|-------------|
| Balance | 58,645.57204978 |
| Received | 99,345.54033548 |
| Sent | 40,699.96828570 |
| Tx count | 571 |
| Coinbase txs (flagged) | 0 |

Wallet **available** ~65,469.93 → gap **~6,824 VRM** vs explorer. Reindex confirms the indexer consistently under-counts vs the user wallet; root cause is in **ingest / RPC vout address extraction**, not the bootstrap zip or ETL copy.

## Teardown (reclaim disk)

Use **`teardown-droplet.sh`** — do **not** run `docker compose down` with both compose files merged; that stops the production project too.

```bash
bash deploy/option-a/reindex-parity/teardown-droplet.sh
```
