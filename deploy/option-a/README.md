# Option A Production Launch (Ubuntu 24.04)

This is the full self-hosted production path for:

- Public app: `https://explorer-vrm.vericonomy.com`
- Legacy Express public host: `https://legacy-explorer-vrm.vericonomy.com`

Stack:

- `caddy` (TLS/public ingress)
- `explorer-web` (Next.js UI)
- `explorer-express` (legacy RPC/Pug routes, still public)
- `explorer-fast-api` (`/v1/*` index-backed API for Next)
- `vrm-indexer` (continuous Verium index updates into SQLite)
- `vrc-indexer` (continuous VeriCoin index updates into SQLite)

## 1) Server prerequisites

Ubuntu 24.04:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2) Clone and prepare config

```bash
git clone https://github.com/VeriConomy/vericonomy-dual-explorer.git
cd vericonomy-dual-explorer
cp deploy/option-a/.env.production.example .env.production
cp configs/chains.example.json configs/chains.json
```

Edit `.env.production`:

- set real RPC creds for **both chains** (`VCEXP_VRM_RPC_*`, `VCEXP_VRC_RPC_*`, and `BTCEXP_BITCOIND_*`)
- set `VCEXP_VRM_RPC_HOST` and `VCEXP_VRC_RPC_HOST` to the Docker bridge gateway (usually `172.18.0.1`)
- set `ACME_EMAIL`
- keep `PUBLIC_DOMAIN=explorer-vrm.vericonomy.com` (or your staging hostname)
- optionally change `LEGACY_PUBLIC_DOMAIN`

Edit `configs/chains.json`:

- copy from `configs/chains.production.example.json` for dual-chain production
- RPC host/port are resolved from `hostEnv` + `.env.production` (`VCEXP_*_RPC_HOST`)
- default ports: VRM `33987`, VRC `58683`

## 2b) VeriCoin node on the same VPS (optional but required for VRC data)

Install `vericoind` on the host (not in Docker). See `deploy/option-a/vericoin.conf.example`.

Minimum host firewall rules for Docker → node RPC:

```bash
sudo ufw allow from 172.18.0.0/16 to any port 58683 proto tcp
sudo ufw allow from 172.18.0.0/16 to any port 33987 proto tcp
```

VeriCoin 2.0 requires all settings under `[vericoin]` in `vericonomy.conf`. Use a bootstrap for faster sync:

```bash
systemctl stop vericoind
curl -LO https://files.vericonomy.com/vrc/bootstrap/vericoin-bootstrap.zip
sudo -u vericoin unzip -o vericoin-bootstrap.zip -d /home/vericoin/.vericonomy/
chown -R vericoin:vericoin /home/vericoin/.vericonomy
systemctl start vericoind
```

Wire explorer env (same `.env.production` file as VRM):

```bash
VCEXP_VRC_RPC_USER=explorer_vrc_rpc_user
VCEXP_VRC_RPC_PASS=<same as vericonomy.conf>
VCEXP_VRC_RPC_HOST=172.18.0.1
VCEXP_VRC_ZMQ=tcp://172.18.0.1:28333
```

After deploy, validate VRC:

```bash
bash deploy/option-a/validate-vrc.sh
```

## 3) DNS and certificates

Create DNS records before first boot:

- `A`/`AAAA` for `explorer-vrm.vericonomy.com` -> VPS public IP
- `A`/`AAAA` for `legacy-explorer-vrm.vericonomy.com` -> VPS public IP

Caddy obtains certificates automatically using ACME.

## 4) Deploy

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production build
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d
```

Check status:

```bash
docker compose -f docker-compose.option-a.yml ps
docker compose -f docker-compose.option-a.yml logs -f caddy
```

## 5) Validation checklist

Public endpoints:

- `https://explorer-vrm.vericonomy.com/`
- `https://explorer-vrm.vericonomy.com/vrm`
- `https://explorer-vrm.vericonomy.com/vrc`
- `https://explorer-vrm.vericonomy.com/v1/health`
- `https://explorer-vrm.vericonomy.com/v1/vrc/summary`
- `https://legacy-explorer-vrm.vericonomy.com/`

Container health:

```bash
docker compose -f docker-compose.option-a.yml exec explorer-fast-api wget -qO- http://127.0.0.1:3003/v1/health
docker compose -f docker-compose.option-a.yml exec explorer-express wget -qO- http://127.0.0.1:3002/api/indexer/status
```

Indexer status:

```bash
docker compose -f docker-compose.option-a.yml exec vrm-indexer npm run indexer:v2:status
docker compose -f docker-compose.option-a.yml exec vrc-indexer npm run indexer:v2:status
docker compose -f docker-compose.option-a.yml logs -f vrc-indexer
```

## 5a) Fast catch-up (`--index-only`)

For initial sync, run the VRC indexer in **index-only** mode (default in `docker-compose.option-a.yml`):

- Indexes blocks, txs, vins/vouts, address events, balances
- **Skips** live insights buckets, period stats, and per-block fee totals
- **Batches RPC** (25 blocks/window by default) with cooperative yields so the site stays responsive
- Forces `storeRawJson: false` unless overridden

Default production tuning (in compose / `.env.production`):

- `VCEXP_INDEXER_YIELD_MS=50` — pause between write batches for API reads
- `VCEXP_INDEXER_BLOCKS_PER_PASS=50` — release the write lock every 50 blocks
- `VCEXP_INDEX_ONLY_RPC_BATCH=25` — RPC window size in index-only mode
- `VCEXP_WAL_CHECKPOINT_MODE=PASSIVE` — avoid TRUNCATE checkpoints while live

VRM catch-up is **off by default** (Compose profile `vrm-catchup`) so VRC tip sync and the web UI are not blocked by a multi-day VRM re-index:

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production --profile vrm-catchup up -d vrm-indexer
```

## 5b) Insights chart backfills (Docker)

One-off jobs use `docker compose run --rm` against the shared SQLite volume. Scripts live in `deploy/option-a/` (run from repo root on the VPS).

**Vericoin (VRC)** — full Insights history (recommended after initial VRC index sync):

```bash
chmod +x deploy/option-a/backfill-vrc-*.sh
./deploy/option-a/backfill-vrc-insights.sh
```

Individual steps (same as manual `docker compose run`):

```bash
./deploy/option-a/backfill-vrc-stats.sh              # Chain activity chart
./deploy/option-a/backfill-vrc-network-metrics.sh  # Difficulty, supply
./deploy/option-a/backfill-vrc-address-growth.sh   # Address growth
```

**Verium (VRM)** — mirror scripts:

```bash
chmod +x deploy/option-a/backfill-vrm-*.sh
./deploy/option-a/backfill-vrm-insights.sh
```

Optional — fix coinbase `transactions.time` from block time (Top Miners week/month/year):

```bash
./deploy/option-a/backfill-vrm-tx-times.sh
```

Uses `node ./bin/backfill-tx-times.js` (not `npm run`). After pulling new code, rebuild the indexer image if the container reports a missing script or file:

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production build vrm-indexer
```

Optional: limit block scans to the last year:

```bash
SINCE=$(date -d '365 days ago' +%s) ./deploy/option-a/backfill-vrc-insights.sh
```

If the database is busy, use **cooperative** backfills (site + VRC indexer can stay up):

```bash
chmod +x deploy/option-a/backfill-insights-cooperative.sh
VCEXP_BACKFILL_COOPERATIVE=1 ./deploy/option-a/backfill-insights-cooperative.sh
```

For fastest backfill (site/indexers paused), stop SQLite writers while backfilling:

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production \
  stop vrc-indexer vrm-indexer explorer-fast-api explorer-express
./deploy/option-a/backfill-vrc-insights.sh
docker compose -f docker-compose.option-a.yml --env-file .env.production \
  start vrc-indexer vrm-indexer explorer-fast-api explorer-express
```

Or use the helper in `deploy/option-a/_backfill-common.sh`:

```bash
source deploy/option-a/_backfill-common.sh
stop_db_writers
./deploy/option-a/backfill-vrc-stats.sh
start_db_writers
```

**What backfills do and do not cover**

| Insights chart                           | VRC backfill command                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Address growth                           | `backfill-vrc-address-growth`                                                  |
| Difficulty, supply                       | `backfill-vrc-network-metrics`                                                 |
| Chain activity                           | `backfill-vrc-stats`                                                           |
| Interest, staking %, expected stake time | Live snapshots only (since `explorer-api` records RPC mining info on new tips) |
| Market price (USD/BTC)                   | External APIs (`/v1/:chain/insights/market-history`), not the indexer DB       |

Equivalent raw compose invocations:

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production run --rm vrc-indexer \
  npm run indexer:backfill-address-growth -- --chain vrc
```

## 6) Security notes

- Never expose Verium or VeriCoin RPC directly to the internet.
- Keep `.env.production` and `configs/chains.json` out of git.
- Keep `database/` and `cache/` volumes private.
- Set `EXPLORER_ADMIN_TOKEN` in `.env.production` to gate `/admin/*`.

## 7) Update / rollback

Production only (`main` branch):

```bash
bash deploy/option-a/deploy-prod.sh
```

Staging only (`staging` branch) — does **not** touch production UI/API containers:

```bash
bash deploy/option-a/deploy-staging.sh
```

See **`deploy/option-a/STAGING.md`** for the two-checkout layout, GitHub Actions, and first-time setup.

Rollback to previous containers (quick):

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production down
# checkout previous git tag/commit
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d
```
