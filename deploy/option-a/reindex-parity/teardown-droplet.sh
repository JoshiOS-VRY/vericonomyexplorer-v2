#!/usr/bin/env bash
# Remove parity reindex resources on the explorer VPS. Does NOT touch production postgres/indexers.
# WARNING: Do NOT run `docker compose down` here — merged compose files stop the whole production project.
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "[teardown] Stopping watcher processes..."
pkill -f "reindex-parity/watch-vrm.sh" 2>/dev/null || true
rm -f /root/reindex-watch.log

echo "[teardown] Removing reindex-only containers..."
docker rm -f \
  vericonomy-vrm-reindex-worker \
  vericonomy-vrc-reindex-worker \
  vericonomy-postgres-reindex \
  2>/dev/null || true

echo "[teardown] Removing reindex volume..."
docker volume rm vericonomyexplorer-v2_vericonomy-pg-reindex 2>/dev/null \
  || docker volume rm vericonomy-pg-reindex 2>/dev/null \
  || docker volume ls -q | grep -i reindex | xargs -r docker volume rm 2>/dev/null \
  || echo "  (no reindex volume found)"

echo "[teardown] Pruning stopped one-off indexer run containers..."
docker ps -a --format '{{.Names}}' | grep -E 'vrm-indexer-run|vrc-indexer-run' | xargs -r docker rm -f 2>/dev/null || true

echo "[teardown] Production check (expect postgres + indexers Up):"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'vericonomy-postgres|vericonomy-vrm-indexer|vericonomy-vrc-indexer' || true

echo "[teardown] Disk:"
docker system df 2>/dev/null | head -6 || true

echo "[teardown] Done (production stack not restarted)."
