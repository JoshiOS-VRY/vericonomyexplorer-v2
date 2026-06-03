\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT COUNT(*) FILTER (WHERE is_spent = 1) AS spent_vouts,
  COUNT(*) FILTER (WHERE is_spent = 0) AS unspent_vouts,
  SUM(value_sats) FILTER (WHERE is_spent = 1) AS spent_sats,
  SUM(value_sats) FILTER (WHERE is_spent = 0) AS unspent_sats
FROM vouts_vrm WHERE address = :'addr';

SELECT COUNT(*) AS spend_events, SUM(-delta_sats) AS spend_total
FROM address_events_vrm WHERE address = :'addr' AND event_type = 'spend';

\echo '=== vouts that should be spent (vin points to them) but is_spent=0 ==='
SELECT vo.txid, vo.n, vo.value_sats, vo.is_spent, vi.txid AS spending_tx, vi.n AS vin_n
FROM vouts_vrm vo
JOIN vins_vrm vi ON vi.prev_txid = vo.txid AND vi.prev_vout = vo.n
WHERE vo.address = :'addr' AND vo.is_spent = 0
LIMIT 15;

SELECT COUNT(*) AS unspent_but_consumed_by_vin
FROM vouts_vrm vo
WHERE vo.address = :'addr' AND vo.is_spent = 0
  AND EXISTS (
    SELECT 1 FROM vins_vrm vi WHERE vi.prev_txid = vo.txid AND vi.prev_vout = vo.n
  );

\echo '=== sample spend tx ==='
SELECT e.txid, e.block_height, e.delta_sats
FROM address_events_vrm e
WHERE e.address = :'addr' AND e.event_type = 'spend'
ORDER BY e.block_height DESC LIMIT 5;
