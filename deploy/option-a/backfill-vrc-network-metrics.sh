#!/usr/bin/env bash
# Backfill VRC difficulty + supply (+ address_count) hourly buckets from indexed blocks.
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrc

EXTRA=(--chain vrc)
if [[ -n "${SINCE:-}" ]]; then
  EXTRA+=(--since "$SINCE")
fi
if [[ -n "${SAMPLE_EVERY_HOURS:-}" ]]; then
  EXTRA+=(--sample-every-hours "$SAMPLE_EVERY_HOURS")
fi
EXTRA+=("$@")

run_indexer_backfill vrc npm run indexer:backfill-network-metrics -- "${EXTRA[@]}"
