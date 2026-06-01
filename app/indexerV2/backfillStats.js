"use strict";

const dbModule = require("./db.js");
const {
	createPeriodStatStatements,
	recordAddressPeriodEvent,
	recordAddressBalanceBucket,
	recordTransactionActivity,
	recordBlockActivity,
	hourBucketStart,
	getPeriodBoundsForTime
} = require("./periodStats.js");

function getBackfillBatchSize() {
	const configured = Number(process.env.VCEXP_BACKFILL_STATS_BATCH_SIZE ?? 25_000);
	return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 25_000;
}

function logProgress(phase, processed, total) {
	const pct = total > 0 ? ((processed / total) * 100).toFixed(1) : "?";
	process.stderr.write(`[backfill-stats] ${phase}: ${processed}/${total} (${pct}%)\n`);
}

function getAddressActivityCategory(row) {
	if (row.event_type === "spend") {
		return "spent";
	}

	if (Number(row.is_coinstake)) {
		return "staked";
	}

	if (Number(row.is_coinbase)) {
		return "mined";
	}

	return "received";
}

function runBatchTransaction(db, rows, fn) {
	if (rows.length === 0) {
		return;
	}

	const run = db.transaction(() => {
		for (const row of rows) {
			fn(row);
		}
	});
	run();
}

function backfillChain(db, chainId, options = {}) {
	const now = Date.now();
	const batchSize = options.batchSize ?? getBackfillBatchSize();
	const periodStatements = createPeriodStatStatements(db);

	db.prepare(`
		DELETE FROM address_balance_buckets WHERE chain_id = ?
	`).run(chainId);

	db.prepare(`
		DELETE FROM chain_activity_buckets WHERE chain_id = ?
	`).run(chainId);

	db.prepare(`
		DELETE FROM address_period_stats WHERE chain_id = ?
	`).run(chainId);

	const eventCount = db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ?
	`).get(chainId).count;

	const selectEvents = db.prepare(`
		SELECT
			address_events.id,
			address_events.address,
			address_events.delta_sats,
			address_events.block_height,
			address_events.time,
			address_events.event_type,
			transactions.is_coinbase,
			transactions.is_coinstake
		FROM address_events
		INNER JOIN transactions
			ON transactions.chain_id = address_events.chain_id
			AND transactions.txid = address_events.txid
		WHERE address_events.chain_id = ?
			AND address_events.id > ?
		ORDER BY address_events.id ASC
		LIMIT ?
	`);

	let lastEventId = 0;
	let processedEvents = 0;

	while (true) {
		const batch = selectEvents.all(chainId, lastEventId, batchSize);
		if (batch.length === 0) {
			break;
		}

		runBatchTransaction(db, batch, (row) => {
			recordAddressBalanceBucket(
				periodStatements,
				chainId,
				row.address,
				row.delta_sats,
				row.time,
				getAddressActivityCategory(row),
				now
			);
		});

		lastEventId = batch[batch.length - 1].id;
		processedEvents += batch.length;
		logProgress(`${chainId} address events`, processedEvents, eventCount);
	}

	const transactions = db.prepare(`
		SELECT time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ? AND time IS NOT NULL
		ORDER BY time ASC
	`).all(chainId);
	const transactionCount = transactions.length;

	for (let offset = 0; offset < transactions.length; offset += batchSize) {
		const batch = transactions.slice(offset, offset + batchSize);
		runBatchTransaction(db, batch, (tx) => {
			recordTransactionActivity(
				periodStatements,
				chainId,
				tx.time,
				Number(tx.is_coinbase),
				Number(tx.is_coinstake),
				now
			);
		});
		logProgress(`${chainId} transactions`, Math.min(offset + batch.length, transactionCount), transactionCount);
	}

	const blocks = db.prepare(`
		SELECT time
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
		ORDER BY time ASC
	`).all(chainId);
	const blockCount = blocks.length;

	for (let offset = 0; offset < blocks.length; offset += batchSize) {
		const batch = blocks.slice(offset, offset + batchSize);
		runBatchTransaction(db, batch, (block) => {
			recordBlockActivity(periodStatements, chainId, block.time, now);
		});
		logProgress(`${chainId} blocks`, Math.min(offset + batch.length, blockCount), blockCount);
	}

	const selectPeriodRows = db.prepare(`
		SELECT
			id,
			address,
			time,
			delta_sats,
			txid,
			block_height
		FROM address_events
		WHERE chain_id = ?
			AND id > ?
		ORDER BY id ASC
		LIMIT ?
	`);

	const seenTxByPeriod = new Set();
	lastEventId = 0;
	processedEvents = 0;

	while (true) {
		const batch = selectPeriodRows.all(chainId, lastEventId, batchSize);
		if (batch.length === 0) {
			break;
		}

		runBatchTransaction(db, batch, (row) => {
			for (const period of ["week", "month"]) {
				const bounds = getPeriodBoundsForTime(period, row.time);
				const txKey = `${bounds.periodStart}:${row.address}:${row.txid}`;
				const txCountIncrement = !seenTxByPeriod.has(txKey);
				if (txCountIncrement) {
					seenTxByPeriod.add(txKey);
				}

				recordAddressPeriodEvent(
					periodStatements,
					chainId,
					row.address,
					row.delta_sats,
					row.block_height,
					row.time,
					txCountIncrement,
					now
				);
			}
		});

		lastEventId = batch[batch.length - 1].id;
		processedEvents += batch.length;
		logProgress(`${chainId} period stats`, processedEvents, eventCount);
	}

	return {
		chainId,
		events: eventCount,
		transactions: transactionCount,
		blocks: blockCount
	};
}

function main() {
	const chainId = process.argv[2];
	const db = dbModule.openDatabase(undefined, { skipHeavyBackfills: true });

	if (chainId) {
		const result = backfillChain(db, chainId);
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	const results = ["vrm", "vrc"].map(id => backfillChain(db, id));
	console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
	main();
}

module.exports = {
	backfillChain,
	hourBucketStart,
	getBackfillBatchSize
};
