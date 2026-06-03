\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

\echo '=== balances ==='
SELECT balance_sats::numeric/1e8 AS balance,
  total_received_sats::numeric/1e8 AS received,
  total_sent_sats::numeric/1e8 AS sent,
  tx_count
FROM address_balances_vrm WHERE address = :'addr';

\echo '=== coinbase / coinstake unspent ==='
SELECT COUNT(*) FILTER (WHERE t.is_coinbase = 1) AS cb_unspent_n,
  COALESCE(SUM(v.value_sats) FILTER (WHERE t.is_coinbase = 1),0)::numeric/1e8 AS cb_unspent
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0;

\echo '=== spends with unresolved vins (sample) ==='
SELECT COUNT(*) AS unresolved_vins
FROM vins_vrm
WHERE address = :'addr' AND resolved = 0;

\echo '=== largest receive events not in top balance? top 10 receives ==='
SELECT e.block_height, e.txid, e.delta_sats::numeric/1e8 AS coins, t.is_coinbase
FROM address_events_vrm e
JOIN transactions_vrm t ON t.txid = e.txid
WHERE e.address = :'addr' AND e.delta_sats > 0
ORDER BY e.delta_sats DESC LIMIT 10;
