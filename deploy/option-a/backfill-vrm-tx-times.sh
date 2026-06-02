#!/usr/bin/env bash
# Repair transactions.time from blocks.time where tx time is 0/null (helps miners period filters).
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrm

run_indexer_backfill vrm node ./bin/backfill-tx-times.js vrm
