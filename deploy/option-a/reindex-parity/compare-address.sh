#!/usr/bin/env bash
# Compare address balances: production postgres vs isolated reindex DB.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

ADDR="${1:?address required}"
ENV_FILE="${ENV_FILE:-.env.production}"

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

export VCEXP_DB_BACKEND=postgres
export VCEXP_REINDEX_PG_URL="${VCEXP_REINDEX_PG_URL:-postgres://${VCEXP_PG_USER:-vericonomy}:${VCEXP_PG_PASSWORD}@postgres-reindex:5432/${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}}"

exec bash "$(dirname "$0")/compare-address-sql.sh" "$ADDR"
