\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT last_indexed_height, best_rpc_height, (best_rpc_height - last_indexed_height) AS behind
FROM sync_state WHERE chain_id = 'vrm';

SELECT SUM(value_sats) FILTER (WHERE is_spent = 0)::numeric/1e8 AS unspent_coins,
  SUM(value_sats) FILTER (WHERE is_spent = 1)::numeric/1e8 AS spent_coins,
  balance_sats::numeric/1e8 AS balance_coins
FROM vouts_vrm v, address_balances_vrm ab
WHERE v.address = :'addr' AND ab.address = :'addr';

SELECT COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS unspent_after_1100500
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.block_height > 1100500;

SELECT COALESCE(SUM(e.delta_sats),0)::numeric/1e8 AS event_delta_after_1100500
FROM address_events_vrm e
WHERE e.address = :'addr' AND e.block_height > 1100500;

SELECT t.block_height, COUNT(*) AS vouts, SUM(v.value_sats)::numeric/1e8 AS coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.block_height > 1100495
GROUP BY t.block_height ORDER BY t.block_height DESC;

SELECT COUNT(*) AS coinbase_unspent, SUM(v.value_sats)::numeric/1e8 AS coinbase_coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.is_coinbase = 1;
