"use strict";

function toNumber(value) {
	return typeof value === "bigint" ? Number(value) : Number(value);
}

function toBigInt(value) {
	if (value === null || value === undefined) {
		return 0n;
	}

	return typeof value === "bigint" ? value : BigInt(value);
}

// Synchronous variant for the better-sqlite3 migration path (schema.js v7
// backfill), which runs inside a synchronous transaction and cannot await.
function computeBlockTotalsRaw(db, chainId, blockHeight, txCount = 0) {
	const outputRow = db.prepare(`
		SELECT COALESCE(SUM(v.value_sats), 0) AS total
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height = ?
	`).get(chainId, blockHeight);

	const totalOutputSats = toBigInt(outputRow.total);
	const maxFeeTxCount = Number(process.env.VCEXP_BLOCK_FEE_TX_CAP ?? 100);

	if (toNumber(txCount) > maxFeeTxCount) {
		return { feeSats: null, totalOutputSats };
	}

	const nonCoinbaseTxs = db.prepare(`
		SELECT txid
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND is_coinbase = 0
	`).all(chainId, blockHeight);

	let feeSats = 0n;
	if (nonCoinbaseTxs.length > 0) {
		const txids = nonCoinbaseTxs.map(tx => tx.txid);
		const placeholders = txids.map(() => "?").join(",");
		const inputStats = db.prepare(`
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vins
			WHERE chain_id = ? AND txid IN (${placeholders}) AND resolved = 1
			GROUP BY txid
		`).all(chainId, ...txids);
		const outputStats = db.prepare(`
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vouts
			WHERE chain_id = ? AND txid IN (${placeholders})
			GROUP BY txid
		`).all(chainId, ...txids);
		feeSats = sumFees(nonCoinbaseTxs, inputStats, outputStats);
	}

	return { feeSats, totalOutputSats };
}

// Async variant on the unified db interface (used by the read/query path; works
// for both Postgres and the augmented SQLite connection).
async function computeBlockTotalsRawAsync(db, chainId, blockHeight, txCount = 0) {
	const outputRow = await db.get(`
		SELECT COALESCE(SUM(v.value_sats), 0) AS total
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height = ?
	`, [chainId, blockHeight]);

	const totalOutputSats = toBigInt(outputRow.total);
	const maxFeeTxCount = Number(process.env.VCEXP_BLOCK_FEE_TX_CAP ?? 100);

	if (toNumber(txCount) > maxFeeTxCount) {
		return { feeSats: null, totalOutputSats };
	}

	const nonCoinbaseTxs = await db.all(`
		SELECT txid
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND is_coinbase = 0
	`, [chainId, blockHeight]);

	let feeSats = 0n;
	if (nonCoinbaseTxs.length > 0) {
		const txids = nonCoinbaseTxs.map(tx => tx.txid);
		const placeholders = txids.map(() => "?").join(",");
		const inputStats = await db.all(`
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vins
			WHERE chain_id = ? AND txid IN (${placeholders}) AND resolved = 1
			GROUP BY txid
		`, [chainId, ...txids]);
		const outputStats = await db.all(`
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vouts
			WHERE chain_id = ? AND txid IN (${placeholders})
			GROUP BY txid
		`, [chainId, ...txids]);
		feeSats = sumFees(nonCoinbaseTxs, inputStats, outputStats);
	}

	return { feeSats, totalOutputSats };
}

function sumFees(nonCoinbaseTxs, inputStats, outputStats) {
	const inputByTxid = Object.fromEntries(inputStats.map(row => [row.txid, row.total]));
	const outputByTxid = Object.fromEntries(outputStats.map(row => [row.txid, row.total]));

	let feeSats = 0n;
	for (const tx of nonCoinbaseTxs) {
		const inputAtomic = toBigInt(inputByTxid[tx.txid] || 0);
		const txOutputAtomic = toBigInt(outputByTxid[tx.txid] || 0);
		if (inputAtomic >= txOutputAtomic) {
			feeSats += inputAtomic - txOutputAtomic;
		}
	}
	return feeSats;
}

module.exports = {
	computeBlockTotalsRaw,
	computeBlockTotalsRawAsync
};
