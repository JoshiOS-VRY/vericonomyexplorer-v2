\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT t.txid, t.block_height, t.is_coinbase, t.is_coinstake,
  v.n, v.value_sats::numeric/1e8 AS coins, v.is_spent
FROM transactions_vrm t
JOIN vouts_vrm v ON v.txid = t.txid
WHERE v.address = :'addr' AND t.block_height >= 1100490
ORDER BY t.block_height DESC, v.n;

SELECT SUM(v.value_sats)::numeric/1e8 AS unspent_coins_recent
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.block_height >= 1100490;

SELECT t.is_coinbase, COUNT(*) AS cnt, SUM(v.value_sats)::numeric/1e8 AS total_coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0
GROUP BY t.is_coinbase;
