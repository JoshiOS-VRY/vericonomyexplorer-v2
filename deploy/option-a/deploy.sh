#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.production" ]]; then
  echo "Missing .env.production. Copy deploy/option-a/.env.production.example first."
  exit 1
fi

if [[ ! -f "configs/chains.json" ]]; then
  echo "Missing configs/chains.json. Copy configs/chains.example.json and edit it."
  exit 1
fi

docker compose -f docker-compose.option-a.yml --env-file .env.production build
docker compose -f docker-compose.option-a.yml --env-file .env.production up -d
docker compose -f docker-compose.option-a.yml ps
