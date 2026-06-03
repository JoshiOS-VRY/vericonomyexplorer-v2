-- Coinbase vouts with null address but pubkey hash of target address in script.
\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'
\set pkh '2bb01c408642bde2d118bb640f2e48e243544482'

\echo '=== coinbase null-address vouts matching pubkey hash (all time) ==='
SELECT COUNT(*) AS vouts,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS total_coins,
  COALESCE(SUM(v.value_sats) FILTER (WHERE v.is_spent = 0),0)::numeric/1e8 AS unspent_coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1
  AND v.address IS NULL
  AND v.script_pub_key ILIKE '%' || :'pkh' || '%';

\echo '=== same, NOT credited in address_events ==='
SELECT COUNT(*) AS missing_events,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS missing_coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE t.is_coinbase = 1
  AND v.address IS NULL
  AND v.script_pub_key ILIKE '%' || :'pkh' || '%'
  AND NOT EXISTS (
    SELECT 1 FROM address_events_vrm e
    WHERE e.address = :'addr' AND e.txid = v.txid AND e.delta_sats > 0
  );

\echo '=== wallet gap reference ~6824.36 VRM ==='
