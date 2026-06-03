\set addr 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176'

\echo Wallet available target ~65469.93, explorer 58645.57, gap ~6824.36

\echo '=== Large unspent vouts (top 20) ==='
SELECT v.txid, v.n, t.block_height, t.is_coinbase, v.value_sats::numeric/1e8 AS coins
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0
ORDER BY v.value_sats DESC LIMIT 20;

\echo '=== Sum unspent excluding block >= 1100499 (pre-recent burst) ==='
SELECT SUM(v.value_sats)::numeric/1e8 AS unspent_before_recent
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.block_height < 1100499;

\echo '=== Sum unspent at 1100499+ ==='
SELECT SUM(v.value_sats)::numeric/1e8 AS unspent_recent
FROM vouts_vrm v JOIN transactions_vrm t ON t.txid = v.txid
WHERE v.address = :'addr' AND v.is_spent = 0 AND t.block_height >= 1100499;

\echo '=== blocks where extracted_by_address set but not this addr - sample ==='
SELECT extracted_by_address, COUNT(*) FROM blocks_vrm
WHERE height > 1100400 AND extracted_by_address IS NOT NULL
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
