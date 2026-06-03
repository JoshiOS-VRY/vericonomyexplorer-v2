"use strict";

const SATOSHI = 100000000n;
const seriesCache = new WeakMap();

function toSafeInteger(value) {
	const parsed = typeof value === "bigint" ? Number(value) : Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

// Reads the precomputed per-height running total from block_mint (maintained by
// refreshAnalytics.js). cumulative_sats is already the inclusive running mint
// total at each height, so no per-tx aggregation / correlated subqueries here.
async function loadBlockMintRows(db, chainId) {
	return db.all(`
		SELECT height, cumulative_sats
		FROM block_mint
		WHERE chain_id = ?
		ORDER BY height ASC
	`, [chainId]);
}

async function buildSupplySeries(db, chainId) {
	let byChain = seriesCache.get(db);
	if (!byChain) {
		byChain = new Map();
		seriesCache.set(db, byChain);
	}

	if (byChain.has(chainId)) {
		return byChain.get(chainId);
	}

	const mintRows = await loadBlockMintRows(db, chainId);
	const entries = [];

	for (const row of mintRows) {
		const cumulativeSats = BigInt(row.cumulative_sats || 0);
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

// Hot path (API live snapshot): a single indexed lookup against block_mint
// instead of materializing the whole series in the query worker.
async function indexedSupplyAtHeight(db, chainId, height) {
	const targetHeight = toSafeInteger(height);
	if (targetHeight < 0) {
		return null;
	}

	const row = await db.get(`
		SELECT cumulative_sats
		FROM block_mint
		WHERE chain_id = ? AND height <= ?
		ORDER BY height DESC LIMIT 1
	`, [chainId, targetHeight]);

	if (!row || row.cumulative_sats == null) {
		return null;
	}

	return Number(BigInt(row.cumulative_sats)) / Number(SATOSHI);
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
