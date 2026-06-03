#!/usr/bin/env bash
# Poll VRM parity reindex progress (prod untouched).
set -euo pipefail

INTERVAL="${REINDEX_WATCH_INTERVAL_SEC:-60}"
ADDR="${REINDEX_WATCH_ADDRESS:-VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176}"
FIRST_SEEN="${REINDEX_WATCH_FIRST_SEEN_HEIGHT:-894865}"
ENV_FILE="${ENV_FILE:-.env.production}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

COMPOSE_REINDEX=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)

worker_status() {
  docker inspect -f '{{.State.Status}}' vericonomy-vrm-reindex-worker 2>/dev/null || echo "missing"
}

reindex_height() {
  "${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}" -t -A -c \
    "SELECT COALESCE(last_indexed_height,0) FROM sync_state WHERE chain_id='vrm';" 2>/dev/null | tr -d '[:space:]' || echo "?"
}

address_snapshot() {
  "${COMPOSE_REINDEX[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}" -t -A -c \
    "SELECT COALESCE(balance_sats,0), COALESCE(total_received_sats,0), COALESCE(tx_count,0)
     FROM address_balances_vrm WHERE address='${ADDR}';" 2>/dev/null | tr -d '[:space:]' || echo ""
}

echo "[watch] VRM reindex parity — interval ${INTERVAL}s (Ctrl+C to stop)"
echo "[watch] compare at tip: bash deploy/option-a/reindex-parity/compare-address-sql.sh ${ADDR}"
echo ""

while true; do
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  status="$(worker_status)"
  height="$(reindex_height)"
  addr="$(address_snapshot)"

  line="[$ts] worker=$status indexed_height=$height"
  if [[ -n "$addr" && "$addr" != "" ]]; then
    IFS='|' read -r bal recv txs <<< "$addr"
    line+=" address_balance_sats=$bal received_sats=$recv tx_count=$txs"
  elif [[ -n "$height" && "$height" =~ ^[0-9]+$ && "$height" -ge "$FIRST_SEEN" ]]; then
    line+=" (past first-seen ${FIRST_SEEN}; address row may appear soon)"
  fi

  echo "$line"

  if [[ "$status" == "exited" ]]; then
    code="$(docker inspect -f '{{.State.ExitCode}}' vericonomy-vrm-reindex-worker 2>/dev/null || echo '?')"
    echo "[watch] worker exited code=$code — last logs:"
    docker logs --tail 15 vericonomy-vrm-reindex-worker 2>&1 || true
    if [[ "$code" == "0" ]]; then
      echo "[watch] reindex finished — run compare-address-sql.sh"
    fi
    exit 0
  fi

  sleep "$INTERVAL"
done
