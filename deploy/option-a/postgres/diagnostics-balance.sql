-- Explorer balance / indexing integrity checks (read-only)
\set ON_ERROR_STOP on

\echo '=== sync_state ==='
SELECT chain_id, best_rpc_height, last_indexed_height, last_checked_height, status, status_message,
       (best_rpc_height - last_indexed_height) AS blocks_behind
FROM sync_state ORDER BY chain_id;

\echo '=== blocks summary ==='
SELECT chain_id, COUNT(*) FILTER (WHERE status <> 'main') AS non_main_blocks,
       MAX(height) AS max_height, COUNT(*) AS block_count
FROM blocks GROUP BY chain_id ORDER BY chain_id;

\echo '=== block height gaps (main chain) ==='
WITH heights AS (
  SELECT chain_id, height, LEAD(height) OVER (PARTITION BY chain_id ORDER BY height) AS next_h
  FROM blocks WHERE status = 'main'
)
SELECT chain_id, COUNT(*) AS gap_count, COALESCE(MAX(next_h - height - 1), 0) AS max_gap_size
FROM heights WHERE next_h IS NOT NULL AND next_h - height > 1
GROUP BY chain_id;

\echo '=== address_balances vs SUM(address_events) mismatches ==='
SELECT ab.chain_id, COUNT(*) AS mismatch_count,
       MIN(ab.balance_sats - ev.event_balance) AS min_diff_sats,
       MAX(ab.balance_sats - ev.event_balance) AS max_diff_sats
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(delta_sats)::bigint AS event_balance
  FROM address_events GROUP BY chain_id, address
) ev ON ev.chain_id = ab.chain_id AND ev.address = ab.address
WHERE ab.balance_sats <> ev.event_balance
GROUP BY ab.chain_id;

\echo '=== sample balance mismatches (top 15 by abs diff) ==='
SELECT ab.chain_id, ab.address, ab.balance_sats, ev.event_balance,
       (ab.balance_sats - ev.event_balance) AS diff_sats, ab.tx_count
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(delta_sats)::bigint AS event_balance
  FROM address_events GROUP BY chain_id, address
) ev ON ev.chain_id = ab.chain_id AND ev.address = ab.address
WHERE ab.balance_sats <> ev.event_balance
ORDER BY ABS(ab.balance_sats - ev.event_balance) DESC
LIMIT 15;

\echo '=== address_balances with no events (nonzero) ==='
SELECT ab.chain_id, COUNT(*) AS orphan_rows, SUM(ab.balance_sats) AS total_orphan_sats
FROM address_balances ab
LEFT JOIN (
  SELECT chain_id, address FROM address_events GROUP BY chain_id, address
) ev ON ev.chain_id = ab.chain_id AND ev.address = ab.address
WHERE ev.address IS NULL AND ab.balance_sats <> 0
GROUP BY ab.chain_id;

\echo '=== UTXO balance vs address_balances (unspent vouts) ==='
SELECT v.chain_id, COUNT(*) AS utxo_balance_mismatch
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.balance_sats <> v.utxo_sats
GROUP BY v.chain_id;

\echo '=== sample UTXO vs balance mismatches ==='
SELECT ab.chain_id, ab.address, ab.balance_sats, v.utxo_sats,
       (ab.balance_sats - v.utxo_sats) AS diff_sats
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.balance_sats <> v.utxo_sats
ORDER BY ABS(ab.balance_sats - v.utxo_sats) DESC
LIMIT 15;

\echo '=== address_transactions net_delta vs events per tx ==='
SELECT at.chain_id, COUNT(*) AS tx_delta_mismatch
FROM address_transactions at
JOIN (
  SELECT chain_id, address, txid, SUM(delta_sats)::bigint AS event_net
  FROM address_events GROUP BY chain_id, address, txid
) ev ON ev.chain_id = at.chain_id AND ev.address = at.address AND ev.txid = at.txid
WHERE COALESCE(at.net_delta_sats, 0) <> ev.event_net
GROUP BY at.chain_id;

\echo '=== unresolved / null-value vins ==='
SELECT chain_id,
  COUNT(*) FILTER (WHERE resolved = 0 AND prev_txid IS NOT NULL) AS unresolved_vins,
  COUNT(*) FILTER (WHERE value_sats IS NULL AND prev_txid IS NOT NULL) AS vins_null_value
FROM vins GROUP BY chain_id ORDER BY chain_id;

\echo '=== spent vouts missing spent_by_txid ==='
SELECT chain_id, COUNT(*) AS spent_flag_mismatch
FROM vouts WHERE is_spent = 1 AND spent_by_txid IS NULL
GROUP BY chain_id;

\echo '=== multi-address vouts (secondary addr not primary) ==='
SELECT va.chain_id, COUNT(DISTINCT (va.txid, va.n)) AS multi_addr_vout_count
FROM vout_addresses va
WHERE va.address_index > 0
GROUP BY va.chain_id;

\echo '=== txs in blocks missing from transactions table ==='
SELECT b.chain_id, COUNT(*) AS blocks_with_tx_mismatch
FROM blocks b
WHERE b.status = 'main'
  AND b.tx_count <> (
    SELECT COUNT(*) FROM transactions t
    WHERE t.chain_id = b.chain_id AND t.block_height = b.height
  )
GROUP BY b.chain_id;

\echo '=== recent indexer_meta ==='
SELECT key, LEFT(value, 80) AS value_preview, updated_at FROM indexer_meta ORDER BY updated_at DESC LIMIT 10;
