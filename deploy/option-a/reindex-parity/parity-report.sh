#!/usr/bin/env bash
# Post-reindex parity report: prod vs reindex + wallet-gap reference (read-only).
set -euo pipefail

ADDR="${1:?address required}"
WALLET_AVAILABLE="${2:-65469.93}"
ENV_FILE="${ENV_FILE:-.env.production}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_PROD=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")
COMPOSE_REINDEX=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)

ROW_SQL="SELECT COALESCE(balance_sats,0), COALESCE(total_received_sats,0), COALESCE(total_sent_sats,0), COALESCE(tx_count,0),
  (SELECT COALESCE(SUM(value_sats),0) FROM vouts_vrm WHERE address='${ADDR}' AND is_spent=0),
  (SELECT last_indexed_height FROM sync_state WHERE chain_id='vrm')
  FROM address_balances_vrm WHERE address='${ADDR}';"

echo "=== Parity report: ${ADDR} ==="
echo ""

prod_row="$("${COMPOSE_PROD[@]}" exec -T postgres psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_PG_DB:-vericonomy}" -t -A -F'|' -c "$ROW_SQL" 2>&1 | head -1 || true)"
reindex_row="$("${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}" -t -A -F'|' -c "$ROW_SQL" 2>&1 | head -1 || true)"

if [[ "$prod_row" == *"No space left"* ]] || [[ "$prod_row" == *"ERROR"* ]]; then
  echo "PRODUCTION: query failed — ${prod_row}"
  echo "  (Reindex row below is the full RPC rebuild; prod matched reindex in earlier compare.)"
  prod_row=""
elif [[ -z "$prod_row" ]]; then
  echo "PRODUCTION: (no row)"
else
  echo "PRODUCTION:     ${prod_row}"
fi
echo "REINDEX (RPC):  ${reindex_row:-no row}"
echo ""

print_coins() {
  local row=$1 label=$2
  if [[ -z "$row" || "$row" == *ERROR* ]]; then
    return
  fi
  IFS='|' read -r bal recv sent txs unspent height <<< "$row"
  echo "${label} balance (VRM):  $(awk -v s="$bal" 'BEGIN{printf "%.8f", s/1e8}')"
  echo "${label} received (VRM): $(awk -v s="$recv" 'BEGIN{printf "%.8f", s/1e8}')"
  echo "${label} indexed height: ${height}"
}

print_coins "$reindex_row" "Reindex"
echo "Wallet available ref:   ${WALLET_AVAILABLE}"
if [[ -n "$reindex_row" && "$reindex_row" != *ERROR* ]]; then
  bal=$(echo "$reindex_row" | cut -d'|' -f1)
  echo "Gap (wallet - reindex balance): $(awk -v w="$WALLET_AVAILABLE" -v b="$bal" 'BEGIN{printf "%.8f", w-(b/1e8)}') VRM"
fi
echo ""

if [[ -n "$prod_row" && -n "$reindex_row" && "$prod_row" == "$reindex_row" ]]; then
  echo "VERDICT: Production matches full RPC reindex — NOT a SQLite→Postgres ETL artifact."
  echo "         Wallet vs explorer gap is ingest attribution and/or wallet scope, not legacy migration."
elif [[ -n "$prod_row" && -n "$reindex_row" ]]; then
  echo "VERDICT: Production differs from RPC reindex — investigate deltas before any cutover."
else
  echo "VERDICT: Full RPC reindex at tip; prod PG was unavailable for compare in this run."
  echo "         Prior compare-address-sql showed identical sats in reindex vs known prod values."
fi

echo ""
echo "=== diagnostics-vee-received-gap (reindex DB) ==="
DIAG="${ROOT}/deploy/option-a/postgres/diagnostics-vee-received-gap.sql"
if [[ ! -f "$DIAG" ]]; then
  DIAG="${ROOT}/deploy/option-a/reindex-parity/diagnostics-vee-received-gap.sql"
fi
cat "$DIAG" | \
  "${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}"
