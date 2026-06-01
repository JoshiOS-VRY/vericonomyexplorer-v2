#!/usr/bin/env bash
# Backfill VRC address-growth buckets for Insights (fast; uses address_balances).
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

run_indexer_backfill vrc npm run indexer:backfill-address-growth -- "${EXTRA[@]}"
