#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.staging}"
COMPOSE_FILE="deploy/option-a/docker-compose.staging.yml"
COMPOSE_PROJECT="${STAGING_COMPOSE_PROJECT:-vericonomy-staging}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy deploy/option-a/.env.staging.example and fill in RPC/DB creds."
  exit 1
fi

if [[ ! -f "configs/chains.json" ]]; then
  echo "Missing configs/chains.json. Copy from prod checkout or configs/chains.example.json."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

PROD_ROOT="${EXPLORER_PROD_ROOT:-/root/vericonomyexplorer-v2}"
PROD_ENV="${PROD_ROOT}/.env.production"
STAGING_BRANCH="${STAGING_GIT_BRANCH:-staging}"

echo "==> Staging deploy from $(pwd) (branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown))"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  git fetch origin "$STAGING_BRANCH"
  git checkout "$STAGING_BRANCH"
  git pull --ff-only origin "$STAGING_BRANCH"
fi

echo "==> Build staging explorer-web + explorer-fast-api"
docker compose -p "$COMPOSE_PROJECT" --project-directory "$ROOT_DIR" \
  -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build \
  explorer-web-staging explorer-fast-api-staging

echo "==> Start staging stack"
docker compose -p "$COMPOSE_PROJECT" --project-directory "$ROOT_DIR" \
  -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
  explorer-web-staging explorer-fast-api-staging

echo "==> Sync Caddyfile to prod checkout and reload (staging hostname routing)"
if [[ -d "$PROD_ROOT/deploy/option-a" ]]; then
  cp "$ROOT_DIR/deploy/option-a/Caddyfile" "$PROD_ROOT/deploy/option-a/Caddyfile"
  if [[ -f "$PROD_ENV" ]]; then
    docker compose -f "$PROD_ROOT/docker-compose.option-a.yml" --env-file "$PROD_ENV" \
      exec caddy caddy validate --config /etc/caddy/Caddyfile || true
    if ! docker compose -f "$PROD_ROOT/docker-compose.option-a.yml" --env-file "$PROD_ENV" \
      exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null; then
      echo "==> Caddy reload unavailable — restarting caddy container"
      docker compose -f "$PROD_ROOT/docker-compose.option-a.yml" --env-file "$PROD_ENV" restart caddy
    fi
  else
    echo "WARN: $PROD_ENV not found — reload Caddy manually after first prod deploy."
  fi
else
  echo "WARN: prod root $PROD_ROOT not found — copy Caddyfile and reload Caddy manually."
fi

docker compose -p "$COMPOSE_PROJECT" --project-directory "$ROOT_DIR" \
  -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "Staging: https://${STAGING_DOMAIN:-staging-explorer.vericonomy.com}/"
echo "Health:  https://${STAGING_DOMAIN:-staging-explorer.vericonomy.com}/v1/health"
