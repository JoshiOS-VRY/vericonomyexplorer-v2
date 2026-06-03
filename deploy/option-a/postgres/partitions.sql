-- Per-chain partitions (vrm / vrc). Run after schema.sql, before ETL/indexes.
-- Each partitioned parent gets two physical child tables so VRM and VRC are
-- fully isolated on disk (independent autovacuum, pruning, maintenance).

BEGIN;

CREATE TABLE IF NOT EXISTS blocks_vrm PARTITION OF blocks FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS blocks_vrc PARTITION OF blocks FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS transactions_vrm PARTITION OF transactions FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS transactions_vrc PARTITION OF transactions FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS vouts_vrm PARTITION OF vouts FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS vouts_vrc PARTITION OF vouts FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS vout_addresses_vrm PARTITION OF vout_addresses FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS vout_addresses_vrc PARTITION OF vout_addresses FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS vins_vrm PARTITION OF vins FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS vins_vrc PARTITION OF vins FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS address_events_vrm PARTITION OF address_events FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS address_events_vrc PARTITION OF address_events FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS address_transactions_vrm PARTITION OF address_transactions FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS address_transactions_vrc PARTITION OF address_transactions FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS address_balances_vrm PARTITION OF address_balances FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS address_balances_vrc PARTITION OF address_balances FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS richlist_snapshots_vrm PARTITION OF richlist_snapshots FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS richlist_snapshots_vrc PARTITION OF richlist_snapshots FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS address_period_stats_vrm PARTITION OF address_period_stats FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS address_period_stats_vrc PARTITION OF address_period_stats FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS chain_activity_buckets_vrm PARTITION OF chain_activity_buckets FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS chain_activity_buckets_vrc PARTITION OF chain_activity_buckets FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS address_balance_buckets_vrm PARTITION OF address_balance_buckets FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS address_balance_buckets_vrc PARTITION OF address_balance_buckets FOR VALUES IN ('vrc');

CREATE TABLE IF NOT EXISTS network_metric_buckets_vrm PARTITION OF network_metric_buckets FOR VALUES IN ('vrm');
CREATE TABLE IF NOT EXISTS network_metric_buckets_vrc PARTITION OF network_metric_buckets FOR VALUES IN ('vrc');

COMMIT;
