#!/usr/bin/env bash
# Shared helpers for one-off indexer backfill jobs (option-a Docker stack).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

if [[ "${VCEXP_BACKFILL_COOPERATIVE:-0}" == "1" ]]; then
  export MANAGE_WRITERS="${MANAGE_WRITERS:-0}"
  export VCEXP_BACKFILL_YIELD_MS="${VCEXP_BACKFILL_YIELD_MS:-50}"
  export VCEXP_BACKFILL_STATS_BATCH_SIZE="${VCEXP_BACKFILL_STATS_BATCH_SIZE:-500}"
  export VCEXP_BACKFILL_WRITE_BATCH="${VCEXP_BACKFILL_WRITE_BATCH:-250}"
fi

# Only continuous indexers hold SQLite write locks during normal operation.
DB_WRITER_SERVICES=(vrc-indexer vrm-indexer)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (copy deploy/option-a/.env.production.example)."
  exit 1
fi

if [[ ! -f "configs/chains.json" ]]; then
  echo "Missing configs/chains.json."
  exit 1
fi

# vrm-indexer and vrc-indexer share the same image; either can run backfills.
indexer_service_for_chain() {
  case "$1" in
    vrm) echo "vrm-indexer" ;;
    vrc) echo "vrc-indexer" ;;
    *)
      echo "Unknown chain: $1 (use vrm or vrc)" >&2
      exit 1
      ;;
  esac
}

running_db_writers() {
  local running=()
  local service
  for service in "${DB_WRITER_SERVICES[@]}"; do
    if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx "$service"; then
      running+=("$service")
    fi
  done
  (IFS=$'\n'; echo "${running[*]:-}")
}

stop_db_writers() {
  local running
  running="$(running_db_writers)"
  if [[ -z "$running" ]]; then
    echo "No DB writer services running."
    return 0
  fi
  # shellcheck disable=SC2206
  local services=($running)
  echo "Stopping DB writers: ${services[*]}"
  "${COMPOSE[@]}" stop "${services[@]}"
}

start_db_writers() {
  echo "Starting DB writers: vrc-indexer"
  "${COMPOSE[@]}" up -d vrc-indexer
}

start_vrm_catchup() {
  echo "Starting VRM catch-up indexer (profile vrm-catchup)"
  "${COMPOSE[@]}" --profile vrm-catchup up -d vrm-indexer
}

run_indexer_backfill() {
  local chain="$1"
  shift
  local service
  service="$(indexer_service_for_chain "$chain")"
  echo "==> [$chain] docker compose run --rm $service $*"
  "${COMPOSE[@]}" run --rm -e VCEXP_BACKFILL_COOPERATIVE=1 -e VCEXP_BACKFILL_YIELD_MS="${VCEXP_BACKFILL_YIELD_MS:-50}" "$service" "$@"
}

run_cooperative_backfill() {
  local chain="$1"
  shift
  export VCEXP_BACKFILL_COOPERATIVE=1
  export VCEXP_BACKFILL_YIELD_MS="${VCEXP_BACKFILL_YIELD_MS:-50}"
  export VCEXP_BACKFILL_STATS_BATCH_SIZE="${VCEXP_BACKFILL_STATS_BATCH_SIZE:-500}"
  export VCEXP_BACKFILL_WRITE_BATCH="${VCEXP_BACKFILL_WRITE_BATCH:-250}"
  echo "Cooperative backfill for $chain (site + vrc-indexer may stay up)"
  run_indexer_backfill "$chain" "$@"
}

optional_since_args() {
  # Export SINCE=unix_timestamp before invoking a script to limit backfill range.
  if [[ -n "${SINCE:-}" ]]; then
    echo --since "$SINCE"
  fi
}

warn_if_indexer_running() {
  local running
  running="$(running_db_writers)"
  if [[ -n "$running" ]]; then
    echo "Note: indexers still running ($running)."
    echo "Cooperative backfills use write locks + yields; for fastest backfill, stop writers:"
    echo "  source deploy/option-a/_backfill-common.sh && stop_db_writers"
    echo "  ... run backfill ..."
    echo "  source deploy/option-a/_backfill-common.sh && start_db_writers"
  fi
}
