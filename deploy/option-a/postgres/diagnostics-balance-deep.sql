\set ON_ERROR_STOP on

SELECT COUNT(*) AS orphan_unspent_vouts_vrc
FROM vouts v
WHERE v.chain_id = 'vrc' AND v.is_spent = 0 AND v.address IS NOT NULL AND v.value_sats > 0
  AND NOT EXISTS (
    SELECT 1 FROM address_events e
    WHERE e.chain_id = v.chain_id AND e.address = v.address AND e.txid = v.txid
      AND e.delta_sats > 0
  );

SELECT COUNT(*) AS orphan_unspent_vouts_vrm
FROM vouts v
WHERE v.chain_id = 'vrm' AND v.is_spent = 0 AND v.address IS NOT NULL AND v.value_sats > 0
  AND NOT EXISTS (
    SELECT 1 FROM address_events e
    WHERE e.chain_id = v.chain_id AND e.address = v.address AND e.txid = v.txid
      AND e.delta_sats > 0
  );

SELECT v.txid, v.n, v.value_sats, v.is_spent,
  (SELECT COALESCE(SUM(delta_sats),0) FROM address_events e
   WHERE e.chain_id='vrc' AND e.address='VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR' AND e.txid=v.txid) AS event_net
FROM vouts v
WHERE v.chain_id='vrc' AND v.address='VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR'
  AND v.is_spent=0 AND v.value_sats>0
ORDER BY v.value_sats DESC LIMIT 15;

SELECT SUM(v.value_sats) AS unspent_missing_receive
FROM vouts v
WHERE v.chain_id = 'vrc' AND v.is_spent = 0 AND v.address IS NOT NULL AND v.value_sats > 0
  AND NOT EXISTS (
    SELECT 1 FROM address_events e
    WHERE e.chain_id = v.chain_id AND e.address = v.address AND e.txid = v.txid AND e.delta_sats > 0
  );

SELECT chain_id, COUNT(*) AS utxo_mismatch FROM (
  SELECT ab.chain_id
  FROM address_balances ab
  JOIN (
    SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
    FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
    GROUP BY chain_id, address
  ) v ON v.chain_id = ab.chain_id AND v.address = ab.address
  WHERE ab.balance_sats <> v.utxo_sats
) x GROUP BY chain_id;

SELECT chain_id, COUNT(*) AS balance_gt_utxo
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.balance_sats > v.utxo_sats
GROUP BY chain_id;

SELECT COUNT(*) AS unspent_but_has_spend_event
FROM vouts v
JOIN address_events e ON e.chain_id = v.chain_id AND e.address = v.address AND e.txid = v.txid
WHERE v.chain_id = 'vrc' AND v.is_spent = 0 AND v.value_sats > 0 AND e.delta_sats < 0;

SELECT COUNT(*) AS spent_flag_but_no_spend_event
FROM vouts v
WHERE v.chain_id = 'vrc' AND v.is_spent = 1
  AND NOT EXISTS (
    SELECT 1 FROM address_events e
    WHERE e.chain_id = v.chain_id AND e.address = v.address AND e.txid = v.spent_by_txid AND e.delta_sats < 0
  );
