# VRM RPC reindex parity — results (2026-06-03)

> **Full write-up:** [`../docs/VRM-balance-investigation-summary.md`](../docs/VRM-balance-investigation-summary.md)

Address: `VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176`  
Reindex height: **1,100,575** (caught up, worker exit 0)

## Verdict

**Production and full RPC reindex are identical** for this address. The ~6,824 VRM wallet vs explorer gap is **not** caused by:

- `verium-bootstrap.zip` (chain files only)
- SQLite → Postgres ETL copy
- A one-off corrupt prod row

It **is** a persistent difference between **Verium wallet accounting** (user node) and **explorer ingest** (`ingest.js` + `getVoutAddresses`), or wallet UI scope (e.g. account-wide vs single address).

## Compared numbers (sats → VRM)

| Metric | Production | RPC reindex |
|--------|------------|-------------|
| Balance | 5,864,557,204,978 | 5,864,557,204,978 |
| Received | 9,934,554,033,548 | 9,934,554,033,548 |
| Sent | 4,069,996,828,570 | 4,069,996,828,570 |
| Tx count | 571 | 571 |
| Coinbase txs (flagged) | 0 | 0 |
| Events | 602 | 602 |

Wallet reference: **Available ~65,469.93 VRM** → gap **~6,824.36 VRM** vs explorer balance **58,645.57 VRM**.

## Reindex DB checks (no smoking gun in index)

- First activity height **894,865**; **0** events before that height.
- **0** secondary `vout_addresses` rows with mismatched primary `vouts.address`.
- **0** vouts with `address IS NULL` but `script_pub_key` containing this address or pubkey hash.
- **0** unresolved spends for this address.
- **0** coinbase unspent to this address.
- RPC sample (heights 894,865–896,000): **8** vouts extracted by `getVoutAddresses`, **0** script-only misses.

Explorer node: `listunspent` for this address = **0** (address not in node wallet); `getreceivedbyaddress` not usable on a watch-only/non-wallet address.

## Ops note

While reindex + prod were queried together, **prod Postgres** hit `No space left on device` on `/dev/shm` because `shared_buffers=8GB` exceeded container `shm_size=1gb`. `docker-compose.option-a.yml` was adjusted (`shared_buffers=1536MB`, `shm_size=2gb`). Recreate prod postgres when convenient:

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d postgres
```

## What to run on the **user wallet** node

```bash
verium-cli getreceivedbyaddress "VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176" 0
verium-cli listunspent 0 9999999 '["VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176"]'
```

If `listunspent` sum ≈ **58,645.57** but the UI shows **65,469.93**, the bug is wallet UI scope, not the explorer.  
If `listunspent` sum ≈ **65,469.93**, compare txids against `address_transactions_vrm` for missing receives.

## Teardown reindex stack (optional)

```bash
bash deploy/option-a/reindex-parity/README.md  # see Teardown section
```
