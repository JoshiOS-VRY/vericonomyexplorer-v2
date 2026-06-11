# VRM balance investigation — summary (June 2026)

**Host:** Vericonomy explorer droplet (`178.128.151.104`)  
**Reported issue:** Explorer balance for a Verium (VRM) address lower than the user’s Verium wallet.  
**Case address:** `VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176`  
**Status:** Parity reindex completed; isolated test infrastructure removed from droplet. Production explorer Postgres unchanged in role and data.

---

## Executive summary

We investigated whether the ~**6,824 VRM** gap between the wallet **Available** line (~**65,469.93**) and the explorer **Balance** (~**58,645.57**) was caused by bad production data (SQLite→Postgres migration, chain bootstrap zip, or corrupt rows).

We built a **full RPC reindex from block 0** into a **separate** Postgres database and container stack. At chain tip, **production and the reindex matched exactly** for the case address. The gap is therefore **not** explained by legacy ETL or a one-off prod corruption. Next steps (when revisited) should compare **the user’s wallet node RPC** to the explorer index, or wallet UI scope vs single-address totals.

---

## Reported vs indexed numbers

| Source                                 | VRM                           | Notes                                       |
| -------------------------------------- | ----------------------------- | ------------------------------------------- |
| Explorer balance                       | **58,645.57204978**           | `address_balances_vrm`                      |
| Explorer received / sent               | **99,345.54** / **40,699.97** | `received − sent = balance`                 |
| Wallet Available (user screenshot)     | **~65,469.93**                |                                             |
| Wallet Unconfirmed                     | **~54.39**                    | Aligns with recent indexed unspent near tip |
| Wallet Immature                        | **~2.58**                     |                                             |
| Wallet Total                           | **~65,526.90**                |                                             |
| **Gap (Available − explorer balance)** | **~6,824.36**                 | Primary discrepancy                         |

Implied wallet lifetime received ≈ **106,170 VRM** vs index **99,345.54 VRM** (~**6,825 VRM** missing **receives** in the index if wallet receive totals are authoritative).

---

## What we checked on production Postgres

Before and after the reindex test:

- **Sync:** VRM/VRC at tip; no main-chain height gaps.
- **Global integrity:** `address_balances` = `SUM(address_events)`; no orphan balance rows.
- **Address internal consistency:** Balance = sum of unspent `vouts`; no UTXO/balance mismatch for this address on VRM.
- **Case address:** 571 txs, 602 events, 534 unspent vouts, **0** txs flagged `is_coinbase` in the index; first activity height **894,865**.

Production queries temporarily failed with **`No space left on device`** on `/dev/shm` when prod and reindex Postgres were stressed together. Root cause: `shared_buffers=8GB` with Docker `shm_size=1gb`. **Fix applied (kept):** `shared_buffers=1536MB`, `shm_size=2gb` in `docker-compose.option-a.yml`; prod container recreated.

---

## Bootstrap vs ETL (clarification)

| Artifact                         | What it does                        | Affects explorer balances?              |
| -------------------------------- | ----------------------------------- | --------------------------------------- |
| `verium-bootstrap.zip`           | Seeds `veriumd` block files on disk | **No** — does not write explorer tables |
| Historical SQLite index          | Built via RPC + `ingest.js`         | Source of truth before Postgres         |
| `migrate-sqlite-to-postgres.mjs` | COPY into Postgres                  | **No RPC re-index** at migration time   |
| Running `vericonomy-vrm-indexer` | Continues same ingest into Postgres | Yes, ongoing                            |

Bad balances could come from **ingest logic** or **indexing while the node was catching up**, not from the bootstrap zip containing balance rows.

---

## Parity reindex experiment

### Design

| Component   | Production (kept)                    | Parity test (removed after test)                     |
| ----------- | ------------------------------------ | ---------------------------------------------------- |
| Postgres    | `vericonomy-postgres` / `vericonomy` | `vericonomy-postgres-reindex` / `vericonomy_reindex` |
| Volume      | `vericonomy-pg`                      | `vericonomy-pg-reindex`                              |
| Indexer     | `vericonomy-vrm-indexer`             | `vericonomy-vrm-reindex-worker` (one-shot)           |
| Chain nodes | Host `veriumd` / `vericoind`         | Same RPC, read-only                                  |

- Ingest: **`indexOnly: true`** (blocks, txs, vins/vouts, `address_events`, `address_balances`; no insights/analytics buckets).
- Repo: `docker-compose.reindex-parity.yml`, `bin/reindex-parity-run.js`, `deploy/option-a/reindex-parity/*`.

### Outcome at tip (height **1,100,575**)

| Field                  | Production        | RPC reindex       | Delta |
| ---------------------- | ----------------- | ----------------- | ----- |
| balance_sats           | 5,864,557,204,978 | 5,864,557,204,978 | **0** |
| received_sats          | 9,934,554,033,548 | 9,934,554,033,548 | **0** |
| sent_sats              | 4,069,996,828,570 | 4,069,996,828,570 | **0** |
| tx_count               | 571               | 571               | **0** |
| events                 | 602               | 602               | **0** |
| coinbase_txs (flagged) | 0                 | 0                 | **0** |

**Conclusion:** Rebuilding the index from genesis with current ingest reproduces production. The wallet vs explorer gap is **not** fixed by “re-copying” or “re-ETL” prod data.

### Negative findings on reindex DB (no index bug found for this address)

- **0** `address_events` before height 894,865.
- **0** secondary `vout_addresses` rows where primary `vouts.address` differs.
- **0** vouts with `address IS NULL` but `script_pub_key` containing the address or pubkey hash `2bb01c408642bde2d118bb640f2e48e243544482`.
- **0** unresolved spends for this address.
- **0** unspent coinbase vouts credited to this address.
- RPC sample (894,865–896,000): **8** vouts seen via `getVoutAddresses`, **0** “script-only” pays missed by extraction.

### Explorer node RPC (not the user’s wallet)

On the explorer’s `veriumd` (address not in wallet):

- `listunspent` → **0** UTXOs (expected for non-wallet address).
- `getreceivedbyaddress` → not applicable / fails for non-wallet context.
- `getaddressinfo` → valid P2PKH: `76a9142bb01c408642bde2d118bb640f2e48e24354448288ac`.

Chain-level checks during investigation included `gettxout` for a large confirmed UTXO (~40,897 VRM) that **is** represented in the index (not flagged coinbase; height 922,455).

---

## Interpretation

| Hypothesis                                                                      | Result                                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| SQLite→Postgres ETL corruption                                                  | **Ruled out** (RPC reindex = prod)                                      |
| `verium-bootstrap.zip` wrong balance data                                       | **Ruled out** (zip does not populate index)                             |
| Prod row drift / display math bug                                               | **Ruled out** for this address (internally consistent; matches reindex) |
| Ingest misses vouts with pubkey in script but no `address` field (this address) | **Ruled out** in SQL + spot RPC audit                                   |
| Wallet UI shows broader scope than one address                                  | **Still open**                                                          |
| User wallet node credits receives explorer does not                             | **Still open** — needs CLI on **user** node                             |

---

## When revisiting — recommended steps

1. On the **user’s Verium node** (where the wallet shows ~65,469 Available):

   ```bash
   verium-cli getreceivedbyaddress "VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176" 0
   verium-cli listunspent 0 9999999 '["VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176"]'
   ```

   - If `listunspent` sum ≈ **58,645.57** → explorer correct; investigate wallet UI (account / label scope).
   - If sum ≈ **65,469.93** → diff txids vs `address_transactions_vrm` / `address_events_vrm`.

2. Optional: re-run parity stack from `deploy/option-a/reindex-parity/README.md` (repo scripts retained for a future pass).

3. Do **not** replace prod Postgres from reindex volume without a deliberate cutover plan — reindex proved **equivalence**, not that prod was wrong.

---

## Droplet cleanup (performed)

Removed to reclaim disk:

- `vericonomy-vrm-reindex-worker`, `vericonomy-postgres-reindex`
- `vericonomy-pg-reindex` volume (~tens of GB)
- Background `watch-vrm.sh` / `/root/reindex-watch.log`
- Orphan `docker compose run` indexer containers from analysis

**Kept / restored:**

- `vericonomy-postgres` / `vericonomy` (production data volume `vericonomy-pg` intact)
- `vericonomy-vrm-indexer`, `vericonomy-vrc-indexer`, explorer web/API, caddy
- Host `veriumd` / `vericoind` data

**Note:** An initial `docker compose … down` accidentally stopped the whole merged compose project; production stack was brought back immediately with `docker compose -f docker-compose.option-a.yml --env-file .env.production up -d`. Postgres came up **healthy** on the existing volume. Future teardowns use `teardown-droplet.sh` (container/volume only, no `compose down`).

---

## Repo artifacts (kept for later)

| Path                                                        | Purpose                            |
| ----------------------------------------------------------- | ---------------------------------- |
| `deploy/option-a/docs/VRM-balance-investigation-summary.md` | This document                      |
| `docker-compose.reindex-parity.yml`                         | Isolated parity compose            |
| `deploy/option-a/reindex-parity/`                           | Scripts (compare, start, teardown) |
| `deploy/option-a/postgres/diagnostics-vee-*.sql`            | Ad-hoc SQL probes                  |
| `deploy/option-a/scripts/vrm-*.cjs`                         | RPC helpers                        |
| `bin/reindex-parity-run.js`                                 | Index-only genesis worker          |

---

## References

- Explorer droplet SSH: `root@178.128.151.104` (alias `vericonomy-explorer` if configured).
- Parity tooling README: `deploy/option-a/reindex-parity/README.md`.
- Workspace rule: `.cursor/rules/digitalocean-droplets.mdc`.
