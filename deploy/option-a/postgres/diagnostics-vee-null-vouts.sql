\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'
\set pkh '2bb01c408642bde2d118bb640f2e48e243544482'

SELECT COUNT(*) AS null_addr_unspent, COALESCE(SUM(value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm
WHERE address IS NULL AND is_spent = 0 AND value_sats > 0
  AND script_pub_key LIKE '%' || :'pkh' || '%';

SELECT txid, n, value_sats::numeric/1e8 AS coins, t.block_height, t.is_coinbase
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address IS NULL AND v.is_spent = 0 AND v.value_sats > 100000000
  AND v.script_pub_key LIKE '%' || :'pkh' || '%'
ORDER BY v.value_sats DESC LIMIT 20;

SELECT COUNT(*) AS wrong_addr_null, COALESCE(SUM(value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address IS NULL AND v.is_spent = 0
  AND t.is_coinbase = 1
  AND v.script_pub_key LIKE '%' || :'pkh' || '%';

\echo '=== coinbase vouts to addr with value in last 5000 blocks ==='
SELECT t.block_height, v.txid, v.n, v.value_sats::numeric/1e8 AS coins
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.is_coinbase = 1 AND t.block_height > 1095500
ORDER BY t.block_height DESC LIMIT 10;
