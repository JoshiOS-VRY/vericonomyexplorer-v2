#!/usr/bin/env bash
# Initialize the isolated reindex Postgres (schema + partitions only; no secondary indexes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file "$ENV_FILE" --profile reindex-parity)

echo "== Ensuring postgres-reindex is up =="
"${COMPOSE[@]}" up -d postgres-reindex
"${COMPOSE[@]}" exec -T postgres-reindex pg_isready -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}"

run_psql() {
  "${COMPOSE[@]}" exec -T postgres-reindex psql -U "${VCEXP_PG_USER:-vericonomy}" -d "${VCEXP_REINDEX_PG_DB:-vericonomy_reindex}" -v ON_ERROR_STOP=1 "$@"
}

echo "== Applying schema.sql =="
cat deploy/option-a/postgres/schema.sql | run_psql -f -

echo "== Applying partitions.sql =="
cat deploy/option-a/postgres/partitions.sql | run_psql -f -

echo "== Reindex DB ready (core tables only) =="
run_psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1 LIMIT 20;"
