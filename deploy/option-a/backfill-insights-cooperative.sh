#!/usr/bin/env bash
# Run insights backfills for VRC and VRM while the site stays up.
# Uses cooperative SQLite write locks + batched yields (see _backfill-common.sh).
set -euo pipefail
DIR="$(dirname "$0")"
# shellcheck source=deploy/option-a/_backfill-common.sh
source "$DIR/_backfill-common.sh"

warn_if_indexer_running

echo "=== VRC insights (cooperative) ==="
VCEXP_BACKFILL_COOPERATIVE=1 "$DIR/backfill-vrc-insights.sh"

echo "=== VRM insights (cooperative) ==="
VCEXP_BACKFILL_COOPERATIVE=1 "$DIR/backfill-vrm-insights.sh"

echo "Done. Charts may take a minute to refresh (API cache TTL)."
