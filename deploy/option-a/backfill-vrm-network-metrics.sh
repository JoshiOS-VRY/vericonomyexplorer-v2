#!/usr/bin/env bash
# Backfill VRM difficulty, supply, hashrate, and address_count hourly buckets from blocks.
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrm

EXTRA=(--chain vrm)
if [[ -n "${SINCE:-}" ]]; then
  EXTRA+=(--since "$SINCE")
fi
if [[ -n "${SAMPLE_EVERY_HOURS:-}" ]]; then
  EXTRA+=(--sample-every-hours "$SAMPLE_EVERY_HOURS")
fi
EXTRA+=("$@")

run_indexer_backfill vrm npm run indexer:backfill-network-metrics -- "${EXTRA[@]}"
