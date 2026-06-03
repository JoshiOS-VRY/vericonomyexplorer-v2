SELECT COUNT(*) AS funded_addresses FROM address_balances_vrc WHERE balance_sats > 0;

SELECT COUNT(*) AS utxo_mismatch_vrc FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrc WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrc' AND ab.balance_sats <> v.utxo_sats;

SELECT ab.address,
  ab.balance_sats::numeric / 1e8 AS balance_coins,
  v.utxo_sats::numeric / 1e8 AS utxo_coins,
  (v.utxo_sats - ab.balance_sats)::numeric / 1e8 AS wallet_higher_by_coins
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrc WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrc' AND ab.balance_sats < v.utxo_sats
ORDER BY (v.utxo_sats - ab.balance_sats) DESC;

SELECT COUNT(*) AS tx_delta_mismatch_vrc
FROM address_transactions at
JOIN (
  SELECT chain_id, address, txid, SUM(delta_sats)::bigint AS event_net
  FROM address_events_vrc GROUP BY chain_id, address, txid
) ev ON ev.chain_id = at.chain_id AND ev.address = at.address AND ev.txid = at.txid
WHERE at.chain_id = 'vrc' AND COALESCE(at.net_delta_sats, 0) <> ev.event_net;

SELECT COUNT(*) AS blocks_tx_count_mismatch_vrc
FROM blocks b
WHERE b.chain_id = 'vrc' AND b.status = 'main'
  AND b.tx_count <> (SELECT COUNT(*) FROM transactions_vrc t WHERE t.block_height = b.height);
