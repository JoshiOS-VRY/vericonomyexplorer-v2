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

## 6) Security notes

- Never expose Verium or VeriCoin RPC directly to the internet.
- Keep `.env.production` and `configs/chains.json` out of git.
- Keep `database/` and `cache/` volumes private.
- Set `EXPLORER_ADMIN_TOKEN` in `.env.production` to gate `/admin/*`.

## 7) Update / rollback

Update:

```bash
git pull
docker compose -f docker-compose.option-a.yml --env-file .env.production build
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d
```

Rollback to previous containers (quick):

```bash
docker compose -f docker-compose.option-a.yml --env-file .env.production down
# checkout previous git tag/commit
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d
```
