\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT MIN(block_height) AS min_event_h, MAX(block_height) AS max_event_h
FROM address_events_vrm WHERE address = :'addr';

SELECT key, value FROM indexer_meta ORDER BY updated_at DESC LIMIT 15;
