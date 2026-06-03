\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT last_indexed_height, best_rpc_height FROM sync_state WHERE chain_id = 'vrm';

SELECT balance_sats::numeric/1e8 AS balance_coins FROM address_balances_vrm WHERE address = :'addr';

SELECT SUM(value_sats) FILTER (WHERE is_spent = 0)::numeric/1e8 AS unspent_coins,
  SUM(value_sats) FILTER (WHERE is_spent = 1)::numeric/1e8 AS spent_coins
FROM vouts_vrm WHERE address = :'addr';

SELECT COUNT(*) AS cb_unspent, COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS cb_coins
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.is_coinbase = 1 AND v.is_spent = 0;

SELECT COUNT(*) AS cb_all, COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS cb_coins_all
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.is_coinbase = 1;

SELECT COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS unspent_gt_1100500
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.block_height > 1100500;

SELECT t.block_height, SUM(v.value_sats)::numeric/1e8 AS coins, MAX(t.is_coinbase::int) AS any_cb
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.block_height > 1100490
GROUP BY t.block_height ORDER BY 1 DESC;
