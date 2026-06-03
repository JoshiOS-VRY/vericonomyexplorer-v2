\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

SELECT COUNT(*) AS blocks_mined, MIN(height) AS min_h, MAX(height) AS max_h
FROM blocks_vrm
WHERE extracted_by_address = :'addr' OR extracted_by = :'addr';

SELECT b.height, b.hash, b.extracted_by_address,
  (SELECT SUM(v.value_sats)::numeric/1e8 FROM vouts_vrm v
   JOIN transactions_vrm t ON t.txid = v.txid AND t.is_coinbase = 1
   WHERE t.block_height = b.height AND v.address = :'addr') AS cb_to_addr_coins
FROM blocks_vrm b
WHERE b.extracted_by_address = :'addr'
ORDER BY b.height DESC LIMIT 15;

SELECT COALESCE(SUM(v.value_sats),0)::numeric/1e8 AS indexed_cb_to_addr
FROM vouts_vrm v
JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND t.is_coinbase = 1;

SELECT COUNT(*) AS blocks_with_cb_vout_missing
FROM blocks_vrm b
WHERE b.extracted_by_address = :'addr'
  AND NOT EXISTS (
    SELECT 1 FROM transactions_vrm t
    JOIN vouts_vrm v ON v.txid = t.txid
    WHERE t.block_height = b.height AND t.is_coinbase = 1 AND v.address = :'addr'
  );
