\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT total_received_sats::numeric/1e8 AS recv_events,
  total_sent_sats::numeric/1e8 AS sent_events,
  balance_sats::numeric/1e8 AS balance
FROM address_balances_vrm WHERE address = :'addr';

SELECT SUM(value_sats)::numeric/1e8 AS sum_all_vouts,
  SUM(value_sats) FILTER (WHERE is_spent=0)::numeric/1e8 AS sum_unspent,
  SUM(value_sats) FILTER (WHERE is_spent=1)::numeric/1e8 AS sum_spent_marked
FROM vouts_vrm WHERE address = :'addr';

SELECT COUNT(*) AS vouts_without_receive_event
FROM vouts_vrm v
WHERE v.address = :'addr'
  AND NOT EXISTS (
    SELECT 1 FROM address_events_vrm e
    WHERE e.address = v.address AND e.txid = v.txid AND e.delta_sats > 0
  );

SELECT COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins_vouts_no_receive_event
FROM vouts_vrm v
WHERE v.address = :'addr'
  AND NOT EXISTS (
    SELECT 1 FROM address_events_vrm e
    WHERE e.address = v.address AND e.txid = v.txid AND e.delta_sats > 0
  );

SELECT COALESCE(SUM(e.delta_sats),0)::numeric/1e8 AS positive_events_without_vout
FROM address_events_vrm e
WHERE e.address = :'addr' AND e.delta_sats > 0
  AND NOT EXISTS (
    SELECT 1 FROM vouts_vrm v WHERE v.address = e.address AND v.txid = e.txid AND v.value_sats > 0
  );

\echo '=== vout_addresses for addr where primary vout.address IS NULL ==='
SELECT COUNT(*), COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS coins
FROM vout_addresses_vrm va
JOIN vouts_vrm v ON v.txid = va.txid AND v.n = va.n
WHERE va.address = :'addr' AND v.address IS NULL;
