# Option A Production Launch (Ubuntu 24.04)

This is the full self-hosted production path for:

- Public app: `https://explorer-vrm.vericonomy.com`
- Legacy Express public host: `https://legacy-explorer-vrm.vericonomy.com`

Stack:

- `caddy` (TLS/public ingress)
- `explorer-web` (Next.js UI)
- `explorer-express` (legacy RPC/Pug routes, still public)
- `explorer-fast-api` (`/v1/*` index-backed API for Next)
- `vrm-indexer` (continuous index updates into SQLite)

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

- set real RPC creds (`VCEXP_VRM_RPC_*` and `BTCEXP_BITCOIND_*`)
- set `ACME_EMAIL`
- keep `PUBLIC_DOMAIN=explorer-vrm.vericonomy.com`
- optionally change `LEGACY_PUBLIC_DOMAIN`

Edit `configs/chains.json`:

- `vrm.rpc.host` should be reachable from containers (`127.0.0.1` if node runs on host with host networking bridge/proxy, or private IP/hostname)
- `vrm.rpc.port` should be the RPC port (default `33987`)

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
- `https://explorer-vrm.vericonomy.com/v1/health`
- `https://legacy-explorer-vrm.vericonomy.com/`

Container health:

```bash
docker compose -f docker-compose.option-a.yml exec explorer-fast-api wget -qO- http://127.0.0.1:3003/v1/health
docker compose -f docker-compose.option-a.yml exec explorer-express wget -qO- http://127.0.0.1:3002/api/indexer/status
```

Indexer status:

```bash
docker compose -f docker-compose.option-a.yml exec vrm-indexer npm run indexer:v2:status
```

## 6) Security notes

- Never expose Verium RPC directly to the internet.
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
