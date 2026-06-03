#!/usr/bin/env bash
# Start VRM RPC reindex worker (detached). Production indexers and postgres are untouched.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)

"${COMPOSE[@]}" up -d postgres-reindex
bash deploy/option-a/reindex-parity/init-db.sh

docker rm -f vericonomy-vrm-reindex-worker 2>/dev/null || true

echo "== Starting VRM reindex (background) =="
"${COMPOSE[@]}" run -d --name vericonomy-vrm-reindex-worker vrm-reindex-worker

echo "Logs: docker logs -f vericonomy-vrm-reindex-worker"
echo "Compare (any time): bash deploy/option-a/reindex-parity/compare-address-sql.sh VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176"
