#!/usr/bin/env bash
set -euo pipefail
ADDR="${1:-VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176}"
ENV_FILE="${ENV_FILE:-.env.production}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_REINDEX=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)
COMPOSE_PROD=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

echo "=== compare-address-sql ==="
bash deploy/option-a/reindex-parity/compare-address-sql.sh "$ADDR" || true

echo ""
echo "=== secondary vout_addresses (reindex) ==="
"${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U vericonomy -d vericonomy_reindex <<SQL
SELECT COUNT(*) AS secondary_rows,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins
FROM vout_addresses_vrm va
JOIN vouts_vrm v ON v.txid = va.txid AND v.n = va.n
WHERE va.address = '${ADDR}' AND (v.address IS NULL OR v.address <> va.address);
SQL

echo ""
echo "=== vouts with script_pub_key containing address but null vout.address ==="
"${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U vericonomy -d vericonomy_reindex <<SQL
SELECT COUNT(*) AS rows,
  COALESCE(SUM(value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm
WHERE address IS NULL
  AND script_pub_key ILIKE '%${ADDR}%';
SQL

echo ""
echo "=== RPC audit (first-seen window) ==="
docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE" run --rm \
  -v "$ROOT/deploy/option-a/scripts/vrm-audit-script-pubkey.cjs:/app/deploy/option-a/scripts/vrm-audit-script-pubkey.cjs:ro" \
  vrm-indexer node /app/deploy/option-a/scripts/vrm-audit-script-pubkey.cjs "$ADDR" 894865 896000
