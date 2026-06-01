#!/usr/bin/env bash
# Shared helpers for one-off indexer backfill jobs (option-a Docker stack).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

# Services that open the shared SQLite volume for writes.
DB_WRITER_SERVICES=(vrc-indexer vrm-indexer explorer-fast-api explorer-express)

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
  echo "Starting DB writers: ${DB_WRITER_SERVICES[*]}"
  "${COMPOSE[@]}" start "${DB_WRITER_SERVICES[@]}"
}

run_indexer_backfill() {
  local chain="$1"
  shift
  local service
  service="$(indexer_service_for_chain "$chain")"
  echo "==> [$chain] docker compose run --rm $service $*"
  "${COMPOSE[@]}" run --rm "$service" "$@"
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
    echo "Note: DB writers still running ($running)."
    echo "Stop them before heavy backfills to avoid SQLite lock contention:"
    echo "  source deploy/option-a/_backfill-common.sh && stop_db_writers"
    echo "  ... run backfill ..."
    echo "  source deploy/option-a/_backfill-common.sh && start_db_writers"
  fi
}
