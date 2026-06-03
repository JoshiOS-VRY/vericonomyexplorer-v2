#!/bin/bash
cd /root/vericonomyexplorer-v2
chmod +x deploy/option-a/reindex-parity/*.sh
bash deploy/option-a/reindex-parity/run-post-reindex-analysis.sh
docker compose -f docker-compose.option-a.yml --env-file .env.production run --rm \
  -v /root/vericonomyexplorer-v2/deploy/option-a/scripts/vrm-wallet-rpc-check.cjs:/app/deploy/option-a/scripts/vrm-wallet-rpc-check.cjs:ro \
  vrm-indexer node /app/deploy/option-a/scripts/vrm-wallet-rpc-check.cjs VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176
cat deploy/option-a/reindex-parity/analysis-min-height.sql | docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file .env.production --profile reindex-parity exec -T postgres-reindex psql -U vericonomy -d vericonomy_reindex
cat deploy/option-a/postgres/diagnostics-vee-coinbase-pkh-gap.sql 2>/dev/null | docker compose -f docker-compose.option-a.yml -f docker-compose.reindex-parity.yml --env-file .env.production --profile reindex-parity exec -T postgres-reindex psql -U vericonomy -d vericonomy_reindex || true
