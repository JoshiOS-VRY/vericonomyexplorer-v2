\set ON_ERROR_STOP on

SELECT t.txid, t.is_coinstake, t.block_height, COUNT(*) AS vout_count,
  SUM(v.value_sats) FILTER (WHERE v.is_spent = 0) AS unspent_sats,
  (SELECT SUM(delta_sats) FROM address_events e
   WHERE e.chain_id='vrc' AND e.address='VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR' AND e.txid=t.txid) AS event_net
FROM transactions t
JOIN vouts v ON v.chain_id=t.chain_id AND v.txid=t.txid
WHERE t.chain_id='vrc' AND v.address='VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR'
  AND v.is_spent=0 AND v.value_sats>100000000000
GROUP BY t.txid, t.is_coinstake, t.block_height
ORDER BY unspent_sats DESC LIMIT 10;

SELECT COUNT(*) AS mismatch_addrs_coinstake_heavy
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id='vrc' AND ab.balance_sats <> v.utxo_sats
  AND EXISTS (
    SELECT 1 FROM vouts vo
    JOIN transactions tx ON tx.chain_id=vo.chain_id AND tx.txid=vo.txid
    WHERE vo.chain_id=ab.chain_id AND vo.address=ab.address AND vo.is_spent=0
      AND tx.is_coinstake=1 AND vo.value_sats > 10000000000
  );

SELECT ab.chain_id, COUNT(*) FILTER (WHERE ab.balance_sats < v.utxo_sats) AS explorer_lower,
  COUNT(*) FILTER (WHERE ab.balance_sats > v.utxo_sats) AS explorer_higher
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id IN ('vrc','vrm')
GROUP BY ab.chain_id;
