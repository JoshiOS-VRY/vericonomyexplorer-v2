#!/usr/bin/env bash
# Start cooperative VRM index-only catch-up (site stays up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

echo "=== VRM index height (before) ==="
"${COMPOSE[@]}" exec -T explorer-express node -e "
const db=require('better-sqlite3')('/app/database/vericonomy-index.sqlite',{readonly:true});
console.log(db.prepare('SELECT MAX(height) h, COUNT(*) c FROM blocks WHERE chain_id=?').get('vrm'));
" 2>/dev/null || true

echo "=== Starting VRM index-only catch-up ==="
"${COMPOSE[@]}" --profile vrm-catchup up -d vrm-indexer

echo "=== Tail indexer (Ctrl+C to stop) ==="
"${COMPOSE[@]}" logs -f --tail=20 vrm-indexer
