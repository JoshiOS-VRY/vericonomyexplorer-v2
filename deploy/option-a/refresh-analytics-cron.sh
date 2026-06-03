#!/usr/bin/env bash
# Cron entrypoint: incrementally refresh analytics rollups for both chains.
#
# The indexers run --index-only, so derived analytics (block totals, chain
# activity, period stats, balance buckets, miner rollup) are advanced here from
# each rollup's persisted watermark. flock guarantees single-flight so a long
# tick never overlaps the next.
#
# Install (host crontab), every 3 minutes:
#   */3 * * * * /root/vericonomyexplorer-v2/deploy/option-a/refresh-analytics-cron.sh >> /root/refresh-analytics.log 2>&1
set -euo pipefail

PROJECT_DIR="/root/vericonomyexplorer-v2"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.option-a.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
LOCK_FILE="/tmp/vcexp-refresh-analytics.lock"

cd "$PROJECT_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "[$(date -u +%FT%TZ)] previous refresh still running, skipping tick"
    exit 0
fi

run_chain() {
    local chain="$1"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm -T \
        -e VCEXP_DB_BACKEND=postgres \
        -v "$PROJECT_DIR/app:/app/app" \
        vrc-indexer node app/indexerV2/refreshAnalytics.js "$chain"
}

echo "[$(date -u +%FT%TZ)] refresh start"
run_chain vrm
run_chain vrc
echo "[$(date -u +%FT%TZ)] refresh done"
