\set ON_ERROR_STOP on
\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

\echo '=== balance row ==='
SELECT * FROM address_balances_vrm WHERE address = :'addr';

\echo '=== event aggregate ==='
SELECT COUNT(*) AS events,
  SUM(delta_sats)::bigint AS event_sum,
  SUM(CASE WHEN delta_sats > 0 THEN delta_sats ELSE 0 END)::bigint AS received,
  SUM(CASE WHEN delta_sats < 0 THEN -delta_sats ELSE 0 END)::bigint AS sent
FROM address_events_vrm WHERE address = :'addr';

\echo '=== UTXO aggregate ==='
SELECT COUNT(*) AS unspent_count, SUM(value_sats)::bigint AS utxo_sum,
  MIN(spent_height) FILTER (WHERE is_spent=1) AS min_spent_h
FROM vouts_vrm WHERE address = :'addr';

\echo '=== unspent vouts ==='
SELECT txid, n, value_sats, value_sats::numeric/1e8 AS coins, spent_by_txid, spent_height
FROM vouts_vrm WHERE address = :'addr' AND is_spent = 0 AND value_sats > 0
ORDER BY value_sats DESC LIMIT 25;

\echo '=== recent events ==='
SELECT txid, block_height, delta_sats, delta_sats::numeric/1e8 AS delta_coins, event_type
FROM address_events_vrm WHERE address = :'addr'
ORDER BY block_height DESC LIMIT 20;

\echo '=== coinstake txs with large unspent ==='
SELECT t.txid, t.is_coinstake, t.block_height,
  SUM(v.value_sats) FILTER (WHERE v.is_spent=0) AS unspent_sats,
  (SELECT SUM(delta_sats) FROM address_events_vrm e WHERE e.address=:'addr' AND e.txid=t.txid) AS event_net
FROM transactions_vrm t
JOIN vouts_vrm v ON v.txid = t.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND v.value_sats > 100000000
GROUP BY t.txid, t.is_coinstake, t.block_height
ORDER BY unspent_sats DESC LIMIT 15;

\echo '=== address in vout_addresses but not primary ==='
SELECT va.txid, va.n, va.address_index, v.address AS primary_addr, v.value_sats
FROM vout_addresses_vrm va
JOIN vouts_vrm v ON v.txid = va.txid AND v.n = va.n
WHERE va.address = :'addr' AND (v.address IS DISTINCT FROM :'addr')
LIMIT 20;

\echo '=== unresolved spends touching this address ==='
SELECT vi.txid, vi.n, vi.prev_txid, vi.prev_vout, vi.resolved, vi.value_sats
FROM vins_vrm vi
JOIN vouts_vrm vo ON vo.txid = vi.prev_txid AND vo.n = vi.prev_vout
WHERE vo.address = :'addr' AND vi.resolved = 0
LIMIT 20;
