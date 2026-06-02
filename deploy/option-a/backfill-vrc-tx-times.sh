#!/usr/bin/env bash
# Repair transactions.time from blocks.time where tx time is 0/null.
set -euo pipefail
source "$(dirname "$0")/_backfill-common.sh"

warn_if_indexer_running vrc

run_indexer_backfill vrc node ./bin/backfill-tx-times.js vrc
