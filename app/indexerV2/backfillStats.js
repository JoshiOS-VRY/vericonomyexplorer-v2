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

function backfillChain(db, chainId) {
	const now = Date.now();
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

	const events = db.prepare(`
		SELECT
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
		ORDER BY address_events.time ASC, address_events.id ASC
	`).all(chainId);

	let transactionCount = 0;
	let blockCount = 0;

	const backfillEvents = db.transaction(() => {
		for (const row of events) {
			recordAddressBalanceBucket(
				periodStatements,
				chainId,
				row.address,
				row.delta_sats,
				row.time,
				getAddressActivityCategory(row),
				now
			);
		}

		const transactions = db.prepare(`
			SELECT time, is_coinbase, is_coinstake
			FROM transactions
			WHERE chain_id = ? AND time IS NOT NULL
			ORDER BY time ASC
		`).all(chainId);
		transactionCount = transactions.length;

		for (const tx of transactions) {
			recordTransactionActivity(
				periodStatements,
				chainId,
				tx.time,
				Number(tx.is_coinbase),
				Number(tx.is_coinstake),
				now
			);
		}

		const blocks = db.prepare(`
			SELECT time
			FROM blocks
			WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
			ORDER BY time ASC
		`).all(chainId);
		blockCount = blocks.length;

		for (const block of blocks) {
			recordBlockActivity(periodStatements, chainId, block.time, now);
		}
	});

	backfillEvents();

	const periodRows = db.prepare(`
		SELECT
			address,
			time,
			delta_sats,
			txid,
			block_height
		FROM address_events
		WHERE chain_id = ?
		ORDER BY time ASC, id ASC
	`).all(chainId);

	const periodBackfill = db.transaction(() => {
		const seenTxByPeriod = new Set();

		for (const row of periodRows) {
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
		}
	});
	periodBackfill();

	return {
		chainId,
		events: events.length,
		transactions: transactionCount,
		blocks: blockCount
	};
}

function main() {
	const chainId = process.argv[2];
	const db = dbModule.openDatabase();

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
	hourBucketStart
};
