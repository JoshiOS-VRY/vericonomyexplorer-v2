"use strict";

const SATOSHI = 100000000n;
const seriesCache = new WeakMap();

function toSafeInteger(value) {
	const parsed = typeof value === "bigint" ? Number(value) : Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function loadBlockMintRows(db, chainId) {
	if (chainId === "vrm") {
		return db.prepare(`
			SELECT t.block_height AS height, COALESCE(SUM(v.value_sats), 0) AS mint_sats
			FROM transactions t
			INNER JOIN vouts v ON v.chain_id = t.chain_id AND v.txid = t.txid
			WHERE t.chain_id = ? AND t.is_coinbase = 1
			GROUP BY t.block_height
			ORDER BY t.block_height ASC
		`).all(chainId);
	}

	return db.prepare(`
		WITH tx_values AS (
			SELECT
				t.block_height AS height,
				t.txid,
				t.is_coinbase,
				t.is_coinstake,
				(
					SELECT COALESCE(SUM(v.value_sats), 0)
					FROM vouts v
					WHERE v.chain_id = t.chain_id AND v.txid = t.txid
				) AS output_sats,
				(
					SELECT COALESCE(SUM(vi.value_sats), 0)
					FROM vins vi
					WHERE vi.chain_id = t.chain_id AND vi.txid = t.txid AND vi.resolved = 1
				) AS input_sats
			FROM transactions t
			WHERE t.chain_id = ? AND (t.is_coinbase = 1 OR t.is_coinstake = 1)
		),
		tx_mint AS (
			SELECT
				height,
				CASE
					WHEN is_coinbase = 1 THEN output_sats
					WHEN is_coinstake = 1 AND output_sats > input_sats THEN output_sats - input_sats
					ELSE 0
				END AS mint_sats
			FROM tx_values
		)
		SELECT height, SUM(mint_sats) AS mint_sats
		FROM tx_mint
		WHERE mint_sats > 0
		GROUP BY height
		ORDER BY height ASC
	`).all(chainId);
}

function buildSupplySeries(db, chainId) {
	let byChain = seriesCache.get(db);
	if (!byChain) {
		byChain = new Map();
		seriesCache.set(db, byChain);
	}

	if (byChain.has(chainId)) {
		return byChain.get(chainId);
	}

	const mintRows = loadBlockMintRows(db, chainId);
	let cumulativeSats = 0n;
	const entries = [];

	for (const row of mintRows) {
		cumulativeSats += BigInt(row.mint_sats || 0);
		entries.push({
			height: toSafeInteger(row.height),
			supplySats: cumulativeSats,
			supply: Number(cumulativeSats) / Number(SATOSHI)
		});
	}

	const series = {
		entries,
		maxHeight: entries.length ? entries[entries.length - 1].height : 0,
		tipSupply: entries.length ? entries[entries.length - 1].supply : null
	};

	byChain.set(chainId, series);
	return series;
}

function supplyAtHeight(series, height) {
	if (!series?.entries?.length) {
		return null;
	}

	const targetHeight = toSafeInteger(height);
	const { entries } = series;

	if (targetHeight < entries[0].height) {
		return 0;
	}

	let lo = 0;
	let hi = entries.length - 1;

	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (entries[mid].height <= targetHeight) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	return entries[lo].supply;
}

function indexedSupplyAtHeight(db, chainId, height) {
	const series = buildSupplySeries(db, chainId);
	return supplyAtHeight(series, height);
}

function clearSupplySeriesCache(db) {
	seriesCache.delete(db);
}

module.exports = {
	buildSupplySeries,
	supplyAtHeight,
	indexedSupplyAtHeight,
	clearSupplySeriesCache
};
