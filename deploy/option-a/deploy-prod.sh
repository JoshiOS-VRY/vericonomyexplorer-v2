#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="docker-compose.option-a.yml"
PROD_BRANCH="${PROD_GIT_BRANCH:-main}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy deploy/option-a/.env.production.example first."
  exit 1
fi

if [[ ! -f "configs/chains.json" ]]; then
  echo "Missing configs/chains.json. Copy configs/chains.example.json and edit it."
  exit 1
fi

echo "==> Production deploy from $(pwd) (branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown))"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  git fetch origin "$PROD_BRANCH"
  git checkout "$PROD_BRANCH"
  git pull --ff-only origin "$PROD_BRANCH"
fi

echo "==> Build + start production stack (does not rebuild staging containers)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build \
  caddy explorer-web explorer-express explorer-fast-api vrm-indexer vrc-indexer

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

echo ""
echo "Production: https://${PUBLIC_DOMAIN:-explorer.vericonomy.com}/"
echo "Staging (unchanged): https://${STAGING_DOMAIN:-staging-explorer.vericonomy.com}/"
