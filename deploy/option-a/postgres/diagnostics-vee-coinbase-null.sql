\set pkh '2bb01c408642bde2d118bb640f2e48e243544482'

SELECT COUNT(*) AS cb_null_vouts,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins,
  COUNT(*) FILTER (WHERE v.is_spent=0) AS unspent_cnt,
  COALESCE(SUM(v.value_sats) FILTER (WHERE v.is_spent=0),0)::numeric/1e8 AS unspent_coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1 AND v.address IS NULL;

SELECT COUNT(*) AS cb_null_matching_pkh,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1 AND v.address IS NULL
  AND (v.script_pub_key LIKE '%' || :'pkh' || '%' OR v.script_type IN ('pubkey', 'nonstandard'));

SELECT t.block_height, v.txid, v.n, v.value_sats::numeric/1e8 AS coins, v.script_type,
  LEFT(v.script_pub_key, 80) AS spk
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1 AND v.address IS NULL AND v.value_sats > 100000000
ORDER BY v.value_sats DESC LIMIT 15;

SELECT COUNT(*) AS cb_null_since_894865,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1 AND v.address IS NULL AND t.block_height >= 894865;
