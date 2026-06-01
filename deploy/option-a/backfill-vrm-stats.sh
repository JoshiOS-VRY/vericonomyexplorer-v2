#!/usr/bin/env bash
# Backfill VRM chain-activity buckets for Insights.
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrm

run_indexer_backfill vrm npm run indexer:backfill-stats -- vrm
