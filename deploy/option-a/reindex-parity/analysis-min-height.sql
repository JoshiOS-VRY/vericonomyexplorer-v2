\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

\echo '=== first / last activity (reindex) ==='
SELECT MIN(block_height) AS first_height, MAX(block_height) AS last_height,
  COUNT(*) AS events
FROM address_events_vrm WHERE address = :'addr';

\echo '=== receive events before height 894865 ==='
SELECT COUNT(*) AS early_events,
  COALESCE(SUM(delta_sats) FILTER (WHERE delta_sats > 0), 0)::numeric / 1e8 AS early_received
FROM address_events_vrm
WHERE address = :'addr' AND block_height < 894865;
