#!/usr/bin/env bash
# Run after the ETL bulk load: build indexes, refresh planner stats, and validate.
set -euo pipefail

cd "$(dirname "$0")/../../.."
PSQL=(docker exec -i vericonomy-postgres psql -U vericonomy -d vericonomy -v ON_ERROR_STOP=1)

echo "== Building indexes (this can take a while on the large partitions) =="
time "${PSQL[@]}" -f - < deploy/option-a/postgres/indexes.sql

echo "== ANALYZE =="
"${PSQL[@]}" -c "ANALYZE;"

echo "== Row counts per chain =="
"${PSQL[@]}" -At -c "
SELECT 'blocks_vrc', count(*) FROM blocks_vrc
UNION ALL SELECT 'blocks_vrm', count(*) FROM blocks_vrm
UNION ALL SELECT 'transactions_vrc', count(*) FROM transactions_vrc
UNION ALL SELECT 'transactions_vrm', count(*) FROM transactions_vrm
UNION ALL SELECT 'vouts_vrc', count(*) FROM vouts_vrc
UNION ALL SELECT 'vins_vrc', count(*) FROM vins_vrc
UNION ALL SELECT 'address_events_vrc', count(*) FROM address_events_vrc
UNION ALL SELECT 'address_balances_vrc', count(*) FROM address_balances_vrc;"

echo "== Max height per chain =="
"${PSQL[@]}" -At -c "
SELECT chain_id, max(height) FROM blocks GROUP BY chain_id ORDER BY chain_id;"

echo "== Largest relations =="
"${PSQL[@]}" -c "
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 12;"

echo "Done."
