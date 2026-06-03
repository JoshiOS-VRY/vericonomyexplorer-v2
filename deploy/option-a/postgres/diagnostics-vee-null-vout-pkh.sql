\set pkh '2bb01c408642bde2d118bb640f2e48e243544482'
\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

\echo '=== all vouts: null address, script contains pkh ==='
SELECT t.is_coinbase, COUNT(*) AS n,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins,
  COALESCE(SUM(v.value_sats) FILTER (WHERE v.is_spent=0),0)::numeric/1e8 AS unspent
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address IS NULL AND v.script_pub_key ILIKE '%' || :'pkh' || '%'
GROUP BY t.is_coinbase ORDER BY t.is_coinbase;

\echo '=== not credited to address_events ==='
SELECT COUNT(*) AS n,
  COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address IS NULL
  AND v.script_pub_key ILIKE '%' || :'pkh' || '%'
  AND NOT EXISTS (
    SELECT 1 FROM address_events_vrm e
    WHERE e.address = :'addr' AND e.txid = v.txid AND e.delta_sats > 0
  );
