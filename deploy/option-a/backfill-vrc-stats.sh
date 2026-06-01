#!/usr/bin/env bash
# Backfill VRC chain-activity buckets (Insights "Chain activity" chart).
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

MANAGE_WRITERS="${MANAGE_WRITERS:-1}"
if [[ "$MANAGE_WRITERS" == "1" ]]; then
  stop_db_writers
  trap start_db_writers EXIT
else
  warn_if_indexer_running vrc
fi

run_indexer_backfill vrc npm run indexer:backfill-stats -- vrc
