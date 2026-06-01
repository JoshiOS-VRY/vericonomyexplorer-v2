#!/usr/bin/env bash
# Full VRM Insights historical backfill (activity + network metrics + address growth).
#
# Example:
#   SINCE=$(date -d '365 days ago' +%s) ./deploy/option-a/backfill-vrm-insights.sh
set -euo pipefail
DIR="$(dirname "$0")"

echo "=== VRM insights backfill: chain activity ==="
"$DIR/backfill-vrm-stats.sh"

echo "=== VRM insights backfill: network metrics ==="
"$DIR/backfill-vrm-network-metrics.sh" "$@"

echo "=== VRM insights backfill: address growth ==="
"$DIR/backfill-vrm-address-growth.sh" "$@"

echo "Done."
