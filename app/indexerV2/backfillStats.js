"use strict";

const dbModule = require("./db.js");
const {
	createPeriodStatStatements,
	recordAddressPeriodEvent,
	recordAddressBalanceBucket,
	recordTransactionActivity,
	recordBlockActivity,
	hourBucketStart,
	getPeriodBoundsForTime,
	toSafeInteger
} = require("./periodStats.js");
const { yieldBetweenWrites, resolveYieldMs } = require("./yield.js");
const writeLock = require("./writeLock.js");

function getBackfillBatchSize() {
	const configured = Number(process.env.VCEXP_BACKFILL_STATS_BATCH_SIZE ?? 500);
	return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 500;
}

function toCount(value) {
	return toSafeInteger(value);
}

function logProgress(phase, processed, total) {
	const done = toCount(processed);
	const goal = toCount(total);
	const pct = goal > 0 ? ((done / goal) * 100).toFixed(1) : "?";
	process.stderr.write(`[backfill-stats] ${phase}: ${done}/${goal} (${pct}%)\n`);
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

function backfillTransactions(db, chainId, periodStatements, batchSize, now) {
	const transactionCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count
		FROM transactions
		WHERE chain_id = ? AND time IS NOT NULL
	`).get(chainId).count);

	const selectTransactions = db.prepare(`
		SELECT time, is_coinbase, is_coinstake, block_height, tx_index
		FROM transactions
		WHERE chain_id = ?
			AND time IS NOT NULL
			AND (
				block_height > ?
				OR (block_height = ? AND tx_index >= ?)
			)
		ORDER BY block_height ASC, tx_index ASC
		LIMIT ?
	`);

	let lastHeight = -1;
	let lastTxIndex = 0;
	let processed = 0;

	while (true) {
		const batch = selectTransactions.all(chainId, lastHeight, lastHeight, lastTxIndex, batchSize);
		if (batch.length === 0) {
			break;
		}

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

		const last = batch[batch.length - 1];
		lastHeight = toCount(last.block_height);
		lastTxIndex = toCount(last.tx_index) + 1;
		processed += batch.length;
		logProgress(`${chainId} transactions (chain activity)`, processed, transactionCount);
		yieldBetweenWrites();
	}

	return transactionCount;
}

function backfillBlocks(db, chainId, periodStatements, batchSize, now) {
	const blockCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
	`).get(chainId).count);

	const selectBlocks = db.prepare(`
		SELECT time, height
		FROM blocks
		WHERE chain_id = ?
			AND status = 'main'
			AND time IS NOT NULL
			AND height > ?
		ORDER BY height ASC
		LIMIT ?
	`);

	let lastHeight = -1;
	let processed = 0;

	while (true) {
		const batch = selectBlocks.all(chainId, lastHeight, batchSize);
		if (batch.length === 0) {
			break;
		}

		runBatchTransaction(db, batch, (block) => {
			recordBlockActivity(periodStatements, chainId, block.time, now);
		});

		lastHeight = toCount(batch[batch.length - 1].height);
		processed += batch.length;
		logProgress(`${chainId} blocks (chain activity)`, processed, blockCount);
		yieldBetweenWrites();
	}

	return blockCount;
}

function backfillAddressEvents(db, chainId, periodStatements, batchSize, now) {
	const eventCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ?
	`).get(chainId).count);

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

		lastEventId = toCount(batch[batch.length - 1].id);
		processedEvents += batch.length;
		logProgress(`${chainId} address events (balance buckets)`, processedEvents, eventCount);
		yieldBetweenWrites();
	}

	return eventCount;
}

function backfillPeriodStats(db, chainId, periodStatements, batchSize, now, eventCount) {
	const totalEvents = toCount(eventCount);
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
	let lastEventId = 0;
	let processedEvents = 0;

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

		lastEventId = toCount(batch[batch.length - 1].id);
		processedEvents += batch.length;
		logProgress(`${chainId} period stats`, processedEvents, totalEvents);
		yieldBetweenWrites();
	}
}

function logIndexedCoverage(db, chainId) {
	const coverage = db.prepare(`
		SELECT
			(SELECT COUNT(*) FROM blocks WHERE chain_id = ? AND status = 'main') AS main_blocks,
			(SELECT MAX(height) FROM blocks WHERE chain_id = ? AND status = 'main') AS max_indexed_height,
			(SELECT last_indexed_height FROM sync_state WHERE chain_id = ?) AS last_indexed_height,
			(SELECT best_rpc_height FROM sync_state WHERE chain_id = ?) AS best_rpc_height
	`).get(chainId, chainId, chainId, chainId);

	const mainBlocks = toCount(coverage.main_blocks);
	const maxHeight = toCount(coverage.max_indexed_height);
	const lastIndexed = toCount(coverage.last_indexed_height);
	const rpcTip = toCount(coverage.best_rpc_height);

	process.stderr.write(
		`[backfill-stats] indexed coverage: ${mainBlocks} main-chain block rows, `
		+ `max height ${maxHeight}, sync_state last_indexed=${lastIndexed}, rpc_tip=${rpcTip}\n`
	);

	if (rpcTip > 0 && maxHeight > 0 && maxHeight < rpcTip - 10) {
		process.stderr.write(
			`[backfill-stats] warning: indexer is ~${rpcTip - maxHeight} blocks behind RPC tip; `
			+ "backfill only covers indexed blocks. Let vrc-indexer catch up, then re-run.\n"
		);
	}
}

function backfillChain(db, chainId, options = {}) {
	const cooperative = options.cooperative !== false
		&& parseTruthy(process.env.VCEXP_BACKFILL_COOPERATIVE) !== false;
	const lockOwner = `backfill-stats:${chainId}`;
	let lock = cooperative ? writeLock.tryAcquireWriteLock(lockOwner) : { skipped: false, fd: null };

	if (cooperative && lock.skipped) {
		return {
			chainId,
			skipped: true,
			reason: "write-lock-held",
			holder: lock.holder || null
		};
	}

	try {
		return backfillChainLocked(db, chainId, options);
	} finally {
		if (cooperative) {
			writeLock.releaseWriteLock(lock);
		}
	}
}

function parseTruthy(value) {
	if (value === undefined || value === null) {
		return undefined;
	}

	return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function backfillChainLocked(db, chainId, options = {}) {
	const now = Date.now();
	const batchSize = options.batchSize ?? getBackfillBatchSize();
	const periodStatements = createPeriodStatStatements(db);

	logIndexedCoverage(db, chainId);

	const eventCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count FROM address_events WHERE chain_id = ?
	`).get(chainId).count);
	const transactionCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count FROM transactions WHERE chain_id = ? AND time IS NOT NULL
	`).get(chainId).count);
	const blockCount = toCount(db.prepare(`
		SELECT COUNT(*) AS count FROM blocks WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
	`).get(chainId).count);

	process.stderr.write(
		`[backfill-stats] starting ${chainId}: `
		+ `${transactionCount} txs, ${blockCount} blocks, ${eventCount} address events `
		+ `(batch size ${batchSize}, yield ${resolveYieldMs()}ms)\n`
	);
	process.stderr.write(
		"[backfill-stats] chain_activity_buckets fill during transactions/blocks phases; "
		+ "address_balance_buckets fill during address-events phase\n"
	);

	db.prepare(`
		DELETE FROM address_balance_buckets WHERE chain_id = ?
	`).run(chainId);

	db.prepare(`
		DELETE FROM chain_activity_buckets WHERE chain_id = ?
	`).run(chainId);

	db.prepare(`
		DELETE FROM address_period_stats WHERE chain_id = ?
	`).run(chainId);

	const transactions = backfillTransactions(db, chainId, periodStatements, batchSize, now);
	const blocks = backfillBlocks(db, chainId, periodStatements, batchSize, now);
	const events = backfillAddressEvents(db, chainId, periodStatements, batchSize, now);
	backfillPeriodStats(db, chainId, periodStatements, batchSize, now, events);

	return {
		chainId,
		events,
		transactions,
		blocks
	};
}

function main() {
	const chainId = process.argv[2];
	const db = dbModule.openDatabase(undefined, {
		skipSeed: true,
		busyTimeoutMs: 120_000
	});

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
