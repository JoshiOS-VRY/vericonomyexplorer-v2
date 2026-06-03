#!/usr/bin/env bash
# Compare one VRM address between prod and reindex Postgres (SQL only).
set -euo pipefail

ADDR="${1:?address required}"
ENV_FILE="${ENV_FILE:-.env.production}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_PROD=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")
COMPOSE_REINDEX=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)

SQL="
SELECT
  'ROW' AS tag,
  (SELECT balance_sats::text FROM address_balances_vrm WHERE address = '${ADDR}') AS balance_sats,
  (SELECT total_received_sats::text FROM address_balances_vrm WHERE address = '${ADDR}') AS received_sats,
  (SELECT total_sent_sats::text FROM address_balances_vrm WHERE address = '${ADDR}') AS sent_sats,
  (SELECT tx_count::text FROM address_balances_vrm WHERE address = '${ADDR}') AS tx_count,
  (SELECT COALESCE(SUM(value_sats),0)::text FROM vouts_vrm WHERE address = '${ADDR}' AND is_spent = 0) AS unspent_sats,
  (SELECT COUNT(*)::text FROM address_events_vrm WHERE address = '${ADDR}') AS events,
  (SELECT COUNT(*)::text FROM transactions t
    JOIN address_transactions_vrm at ON at.txid = t.txid
    WHERE at.address = '${ADDR}' AND t.is_coinbase = 1) AS coinbase_txs,
  (SELECT last_indexed_height::text FROM sync_state WHERE chain_id = 'vrm') AS indexed_height;
"

echo "=== PRODUCTION (vericonomy-postgres / vericonomy) ==="
echo "$SQL" | "${COMPOSE_PROD[@]}" exec -T postgres psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_PG_DB:-vericonomy}" -t -A -F'|'

echo ""
echo "=== REINDEX RPC (vericonomy-postgres-reindex / vericonomy_reindex) ==="
echo "$SQL" | "${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}" -t -A -F'|'

echo ""
echo "Columns: balance_sats|received_sats|sent_sats|tx_count|unspent_sats|events|coinbase_txs|indexed_height"
echo "Divide sats by 1e8 for VRM coins."
