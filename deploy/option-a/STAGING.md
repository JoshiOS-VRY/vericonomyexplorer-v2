# Staging vs production deploy (Option A)

Production and staging are **separate Docker stacks** on the same explorer droplet. Caddy routes by hostname:

| Hostname | Git branch | Checkout on VPS | Deploy script |
|---|---|---|---|
| `explorer.vericonomy.com` | `main` | `/root/vericonomyexplorer-v2` | `deploy/option-a/deploy-prod.sh` |
| `staging-explorer.vericonomy.com` | `staging` | `/root/vericonomyexplorer-v2-staging` | `deploy/option-a/deploy-staging.sh` |

Staging runs only **Next.js + FastAPI** containers. It reads the **same** SQLite index and Postgres as production (indexers stay on prod).

Repo: https://github.com/JoshiOS-VRY/vericonomyexplorer-v2/tree/staging

## One-time server setup

On the explorer droplet (`vericonomy-explorer`):

```bash
# Prod should already exist at /root/vericonomyexplorer-v2 on main
bash /root/vericonomyexplorer-v2/deploy/option-a/setup-staging-checkout.sh
```

Edit staging env (RPC creds are copied from prod):

```bash
nano /root/vericonomyexplorer-v2-staging/.env.staging
```

Reload Caddy with the split-hostname config (from staging checkout — copies to prod and reloads):

```bash
cd /root/vericonomyexplorer-v2-staging
bash deploy/option-a/deploy-staging.sh
```

## Deploy staging only

```bash
ssh vericonomy-explorer
cd /root/vericonomyexplorer-v2-staging
bash deploy/option-a/deploy-staging.sh
```

Or push to the `staging` branch — GitHub Actions runs the same script if these secrets are set:

- `EXPLORER_SSH_HOST` — droplet IP (`178.128.151.104`)
- `EXPLORER_SSH_USER` — `root`
- `EXPLORER_SSH_KEY` — private key (passphrase unlocked locally; store key in GitHub secrets)

## Deploy production only

```bash
ssh vericonomy-explorer
cd /root/vericonomyexplorer-v2
bash deploy/option-a/deploy-prod.sh
```

This does **not** rebuild staging containers.

## Promote staging → production

1. Merge `staging` → `main` on GitHub.
2. On the droplet: `cd /root/vericonomyexplorer-v2 && bash deploy/option-a/deploy-prod.sh`

## Validate

```bash
curl -sS https://staging-explorer.vericonomy.com/v1/health
curl -sS https://explorer.vericonomy.com/v1/health
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep explorer
```

Expected staging containers: `vericonomy-explorer-web-staging`, `vericonomy-explorer-fast-api-staging`.

## Troubleshooting

**502 on staging after first deploy** — Caddy must reload after the split `Caddyfile`. Re-run `deploy-staging.sh` or reload Caddy from the prod checkout.

**External network not found** — Prod stack must be running first (`docker compose -f docker-compose.option-a.yml ps`). Staging joins network `vericonomyexplorer-v2_private`.

**Wrong project name** — If prod was started from a different directory, set `PROD_COMPOSE_PROJECT` in `.env.staging` to match `docker network ls | grep private`.
