#!/usr/bin/env bash
# Shared helpers for one-off indexer backfill jobs (option-a Docker stack).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml --env-file "$ENV_FILE")

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
  local chain="$1"
  local service
  service="$(indexer_service_for_chain "$chain")"
  local running=()
  if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx "$service"; then
    running+=("$service")
  fi
  if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx "explorer-api"; then
    running+=("explorer-api")
  fi
  if ((${#running[@]} > 0)); then
    echo "Note: ${running[*]} running. Stop them before heavy backfills to avoid SQLite lock contention:"
    echo "  ${COMPOSE[*]} stop ${running[*]}"
    echo "  ... run backfill ..."
    echo "  ${COMPOSE[*]} start ${running[*]}"
  fi
}
