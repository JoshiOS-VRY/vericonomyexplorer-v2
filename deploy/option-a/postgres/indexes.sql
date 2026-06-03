-- Secondary indexes. Run AFTER the ETL bulk load for fast index builds.
-- Creating an index on a partitioned parent cascades to every partition.

CREATE INDEX IF NOT EXISTS idx_blocks_chain_time ON blocks (chain_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_chain_status_height ON blocks (chain_id, status, height DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_block ON transactions (chain_id, block_height, tx_index);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_time ON transactions (chain_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_vouts_chain_txid ON vouts (chain_id, txid);
CREATE INDEX IF NOT EXISTS idx_vins_chain_txid ON vins (chain_id, txid);
CREATE INDEX IF NOT EXISTS idx_vouts_chain_address ON vouts (chain_id, address);
CREATE INDEX IF NOT EXISTS idx_vouts_chain_spent ON vouts (chain_id, is_spent, address);
CREATE INDEX IF NOT EXISTS idx_vouts_chain_unspent_address ON vouts (chain_id, address, value_sats DESC) WHERE is_spent = 0;
CREATE INDEX IF NOT EXISTS idx_vout_addresses_chain_address ON vout_addresses (chain_id, address);
CREATE INDEX IF NOT EXISTS idx_vins_chain_prevout ON vins (chain_id, prev_txid, prev_vout);
CREATE INDEX IF NOT EXISTS idx_vins_chain_address ON vins (chain_id, address);
CREATE INDEX IF NOT EXISTS idx_vins_chain_unresolved ON vins (chain_id) WHERE resolved = 0 AND source <> 'coinbase';
CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_txid ON address_events (chain_id, address, txid);
CREATE INDEX IF NOT EXISTS idx_address_events_chain_txid ON address_events (chain_id, txid);
CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_height ON address_events (chain_id, address, block_height DESC);
CREATE INDEX IF NOT EXISTS idx_address_events_chain_height ON address_events (chain_id, block_height DESC);
CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_time ON address_events (chain_id, address, time ASC);
CREATE INDEX IF NOT EXISTS idx_address_events_chain_time ON address_events (chain_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_chain_activity_buckets_chain_start ON chain_activity_buckets (chain_id, bucket_start ASC);
CREATE INDEX IF NOT EXISTS idx_address_transactions_chain_address_height ON address_transactions (chain_id, address, first_seen_height DESC);
CREATE INDEX IF NOT EXISTS idx_address_balances_chain_balance ON address_balances (chain_id, balance_sats DESC);
CREATE INDEX IF NOT EXISTS idx_address_balances_chain_funded_balance ON address_balances (chain_id, balance_sats DESC, address ASC) WHERE balance_sats > 0;
CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_net ON address_period_stats (chain_id, period, period_start, net_sats DESC);
CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_received ON address_period_stats (chain_id, period, period_start, received_sats DESC);
CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_activity ON address_period_stats (chain_id, period, period_start, tx_count DESC, address ASC);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_block_coinbase ON transactions (chain_id, block_height, is_coinbase) WHERE is_coinbase = 1;
CREATE INDEX IF NOT EXISTS idx_address_balance_buckets_chain_address_start ON address_balance_buckets (chain_id, address, bucket_start ASC);
CREATE INDEX IF NOT EXISTS idx_network_metric_buckets_chain_start ON network_metric_buckets (chain_id, bucket_start ASC);
CREATE INDEX IF NOT EXISTS idx_network_metric_buckets_chain_start_desc ON network_metric_buckets (chain_id, bucket_start DESC);
CREATE INDEX IF NOT EXISTS idx_miner_stats_chain_day ON miner_stats (chain_id, day_start ASC);
CREATE INDEX IF NOT EXISTS idx_miner_stats_chain_day_sats ON miner_stats (chain_id, day_start, mined_sats DESC);

-- BRIN indexes for very large append-only tables (cheap, range-scan friendly).
CREATE INDEX IF NOT EXISTS brin_blocks_time ON blocks USING brin (time) WITH (pages_per_range = 64);
CREATE INDEX IF NOT EXISTS brin_address_events_height ON address_events USING brin (block_height) WITH (pages_per_range = 64);
