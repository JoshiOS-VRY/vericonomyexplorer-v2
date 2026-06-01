#!/usr/bin/env bash
# Backfill VRC chain-activity buckets (Insights "Chain activity" chart).
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrc

run_indexer_backfill vrc npm run indexer:backfill-stats -- vrc
