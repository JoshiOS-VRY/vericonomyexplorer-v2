\set ON_ERROR_STOP on

\echo '=== VRM sync ==='
SELECT * FROM sync_state WHERE chain_id = 'vrm';

\echo '=== VRM UTXO vs address_balances (both directions) ==='
SELECT COUNT(*) FILTER (WHERE ab.balance_sats < v.utxo_sats) AS explorer_lower,
  COUNT(*) FILTER (WHERE ab.balance_sats > v.utxo_sats) AS explorer_higher,
  COUNT(*) AS total_mismatch
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrm WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrm' AND ab.balance_sats <> v.utxo_sats;

\echo '=== Top explorer LOWER than UTXO (wallet higher) ==='
SELECT ab.address, ab.balance_sats::numeric/1e8 AS bal, v.utxo_sats::numeric/1e8 AS utxo,
  (v.utxo_sats - ab.balance_sats)::numeric/1e8 AS diff_coins
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrm WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrm' AND ab.balance_sats < v.utxo_sats
ORDER BY (v.utxo_sats - ab.balance_sats) DESC LIMIT 20;

\echo '=== Top explorer HIGHER than UTXO (wallet lower) ==='
SELECT ab.address, ab.balance_sats::numeric/1e8 AS bal, v.utxo_sats::numeric/1e8 AS utxo,
  (ab.balance_sats - v.utxo_sats)::numeric/1e8 AS diff_coins
FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrm WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrm' AND ab.balance_sats > v.utxo_sats
ORDER BY (ab.balance_sats - v.utxo_sats) DESC LIMIT 20;

\echo '=== VRM coinstake-related UTXO mismatch ==='
SELECT COUNT(*) FROM address_balances ab
JOIN (
  SELECT chain_id, address, SUM(value_sats)::bigint AS utxo_sats
  FROM vouts_vrm WHERE is_spent = 0 AND address IS NOT NULL AND value_sats > 0
  GROUP BY chain_id, address
) v ON v.chain_id = ab.chain_id AND v.address = ab.address
WHERE ab.chain_id = 'vrm' AND ab.balance_sats <> v.utxo_sats
  AND EXISTS (
    SELECT 1 FROM vouts_vrm vo
    JOIN transactions_vrm tx ON tx.txid = vo.txid
    WHERE vo.address = ab.address AND vo.is_spent = 0 AND tx.is_coinstake = 1 AND vo.value_sats > 100000000
  );

\echo '=== VRM balances with no UTXO row (ledger only) ==='
SELECT COUNT(*) FROM address_balances ab
WHERE ab.chain_id = 'vrm' AND ab.balance_sats > 0
  AND NOT EXISTS (
    SELECT 1 FROM vouts_vrm v
    WHERE v.address = ab.address AND v.is_spent = 0 AND v.value_sats > 0
  );

\echo '=== VRM UTXO with no balance row ==='
SELECT COUNT(*) FROM (
  SELECT v.address, SUM(v.value_sats) AS utxo_sats
  FROM vouts_vrm v
  WHERE v.is_spent = 0 AND v.address IS NOT NULL AND v.value_sats > 0
  GROUP BY v.address
) u
LEFT JOIN address_balances ab ON ab.chain_id = 'vrm' AND ab.address = u.address
WHERE ab.address IS NULL OR ab.balance_sats = 0;

\echo '=== VRM unresolved vins ==='
SELECT COUNT(*) FILTER (WHERE resolved = 0 AND prev_txid IS NOT NULL) AS unresolved,
  COUNT(*) FILTER (WHERE value_sats IS NULL AND prev_txid IS NOT NULL) AS null_value
FROM vins_vrm;

\echo '=== VRM multi-address vouts (index>0) ==='
SELECT COUNT(DISTINCT (txid, n)) FROM vout_addresses_vrm WHERE address_index > 0;

\echo '=== VRM events vs balance mismatches ==='
SELECT COUNT(*) FROM address_balances ab
JOIN (
  SELECT address, SUM(delta_sats)::bigint AS ev FROM address_events_vrm GROUP BY address
) e ON e.address = ab.address
WHERE ab.chain_id = 'vrm' AND ab.balance_sats <> e.ev;
