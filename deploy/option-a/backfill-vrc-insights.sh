#!/usr/bin/env bash
# Full VRC Insights historical backfill (activity + network metrics + address growth).
#
# Charts filled:
#   - Chain activity     -> indexer:backfill-stats
#   - Difficulty, supply -> indexer:backfill-network-metrics
#   - Address growth     -> indexer:backfill-address-growth
#
# Not filled historically (live API snapshots only since explorer-api records them):
#   - Interest rate, staking %, expected stake time
#   - Market price (LiveCoinWatch / CoinGecko via API, not SQLite)
#
# Optional env:
#   SINCE=<unix>              Limit block-based backfills (e.g. last 365 days)
#   SAMPLE_EVERY_HOURS=1      Hourly buckets (default 1)
#
# Example:
#   SINCE=$(date -d '365 days ago' +%s) ./deploy/option-a/backfill-vrc-insights.sh
set -euo pipefail
DIR="$(dirname "$0")"

echo "=== VRC insights backfill: chain activity ==="
"$DIR/backfill-vrc-stats.sh"

echo "=== VRC insights backfill: network metrics (difficulty, supply) ==="
"$DIR/backfill-vrc-network-metrics.sh" "$@"

echo "=== VRC insights backfill: address growth ==="
"$DIR/backfill-vrc-address-growth.sh" "$@"

echo "Done. Restart explorer-api or wait for cache TTL if charts look stale."
