SELECT address, balance_sats, balance_sats::numeric/1e8 AS balance_coins, tx_count
FROM address_balances_vrm
WHERE balance_sats > 0
ORDER BY balance_sats DESC
LIMIT 15;

SELECT address, balance_sats::numeric/1e8 AS balance_coins
FROM address_balances_vrm
WHERE balance_sats > 100000000
ORDER BY RANDOM()
LIMIT 10;
