#!/usr/bin/env node
"use strict";

// Watermark-driven, incremental analytics refresher (Postgres steady state).
//
// The indexers run with --index-only, so they write the core tables (blocks,
// transactions, vouts, vins, address_events, address_balances) but NOT the
// derived analytics (block totals, chain-activity buckets, address period
// stats, address balance buckets, miner rollup). This script folds only the
// rows newer than each rollup's persisted watermark into those tables, so a
// cron tick is cheap and the first run seeds full history.
//
// It is the single canonical owner of these rollups. Semantics match the live
// ingest path (app/indexerV2/ingest.js):
//   * period stats / balance buckets are applied ONCE per address_event
//     (recordAddressPeriodEvent already writes both week+month buckets),
//   * tx_count increments only on the first event of an (address, txid).
// (The legacy backfillStats.js double-counts period amounts; it is not used on
// the Postgres backend.)
//
// Usage: node app/indexerV2/refreshAnalytics.js vrm|vrc

require("./loadEnv.js");

const dbModule = require("./db.js");
const {
	createPeriodStatStatements,
	recordTransactionActivity,
	recordBlockActivity,
	recordAddressBalanceBucket,
	recordAddressPeriodEvent,
	toSafeInteger
} = require("./periodStats.js");
const { computeBlockTotalsRawAsync } = require("./blockTotals.js");

const HEIGHT_CHUNK = Number(process.env.VCEXP_REFRESH_HEIGHT_CHUNK ?? 20000);
const EVENT_BATCH = Number(process.env.VCEXP_REFRESH_EVENT_BATCH ?? 5000);
const BLOCK_TOTALS_BATCH = Number(process.env.VCEXP_REFRESH_TOTALS_BATCH ?? 2000);

function num(value) {
	return toSafeInteger(value);
}

function log(message) {
	process.stderr.write(`[refresh-analytics] ${message}\n`);
}

function activityCategory(row) {
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

async function getMaxHeight(db, chain) {
	const row = await db.get(
		"SELECT MAX(height) AS h FROM blocks WHERE chain_id = ? AND status = 'main'",
		[chain]
	);
	return row && row.h != null ? num(row.h) : -1;
}

async function getState(db, chain, rollup) {
	return db.get(
		"SELECT last_height, last_event_id, last_time FROM rollup_state WHERE chain_id = ? AND rollup = ?",
		[chain, rollup]
	);
}

async function advanceState(db, chain, rollup, fields) {
	await db.run(
		`INSERT INTO rollup_state (chain_id, rollup, last_height, last_event_id, last_time, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT (chain_id, rollup) DO UPDATE SET
			last_height = excluded.last_height,
			last_event_id = excluded.last_event_id,
			last_time = excluded.last_time,
			updated_at = excluded.updated_at`,
		[
			chain,
			rollup,
			fields.lastHeight ?? -1,
			fields.lastEventId ?? 0,
			fields.lastTime ?? 0,
			Date.now()
		]
	);
}

// blocks.fee_sats / total_output_sats for blocks the indexer added in
// --index-only mode (NULL totals). The one-time bulk seed is the set-based
// backfill-block-totals.sql; here we only compute the NULL tail.
async function refreshBlockTotals(db, chain, maxHeight) {
	const state = await getState(db, chain, "block_totals");
	let wm = state ? num(state.last_height) : -1;
	let processed = 0;

	while (wm < maxHeight) {
		const rows = await db.all(
			`SELECT height, tx_count FROM blocks
			 WHERE chain_id = ? AND status = 'main' AND height > ? AND height <= ?
				AND total_output_sats IS NULL
			 ORDER BY height ASC LIMIT ?`,
			[chain, wm, maxHeight, BLOCK_TOTALS_BATCH]
		);

		if (rows.length === 0) {
			wm = maxHeight;
			break;
		}

		await db.runTransaction(async (txdb) => {
			const update = txdb.prepare(
				"UPDATE blocks SET fee_sats = ?, total_output_sats = ? WHERE chain_id = ? AND height = ?"
			);
			for (const block of rows) {
				const totals = await computeBlockTotalsRawAsync(txdb, chain, num(block.height), num(block.tx_count));
				await update.run(
					totals.feeSats === null ? null : totals.feeSats,
					totals.totalOutputSats,
					chain,
					num(block.height)
				);
			}
		});

		wm = num(rows[rows.length - 1].height);
		processed += rows.length;
		await advanceState(db, chain, "block_totals", { lastHeight: wm });
	}

	await advanceState(db, chain, "block_totals", { lastHeight: maxHeight });
	return processed;
}

// chain_activity_buckets: per-hour mined/staked/received tx counts + block_count.
async function refreshChainActivity(db, chain, maxHeight) {
	const state = await getState(db, chain, "chain_activity");
	let wm = state ? num(state.last_height) : -1;
	let processed = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);
		const txs = await db.all(
			`SELECT time, is_coinbase, is_coinstake FROM transactions
			 WHERE chain_id = ? AND block_height > ? AND block_height <= ? AND time IS NOT NULL`,
			[chain, wm, hi]
		);
		const blocks = await db.all(
			`SELECT time FROM blocks
			 WHERE chain_id = ? AND status = 'main' AND height > ? AND height <= ? AND time IS NOT NULL`,
			[chain, wm, hi]
		);

		await db.runTransaction(async (txdb) => {
			const statements = createPeriodStatStatements(txdb);
			const now = Date.now();
			for (const tx of txs) {
				await recordTransactionActivity(
					statements,
					chain,
					num(tx.time),
					Number(tx.is_coinbase),
					Number(tx.is_coinstake),
					now
				);
			}
			for (const block of blocks) {
				await recordBlockActivity(statements, chain, num(block.time), now);
			}
		});

		wm = hi;
		processed += txs.length + blocks.length;
		await advanceState(db, chain, "chain_activity", { lastHeight: wm });
		log(`${chain} chain_activity: heights<=${wm}/${maxHeight}`);
	}

	return processed;
}

// address_period_stats (week/month) + address_balance_buckets from new events.
async function refreshAddressStats(db, chain, maxHeight) {
	const state = await getState(db, chain, "address_stats");
	let wm = state ? num(state.last_event_id) : 0;
	let processed = 0;

	while (true) {
		const batch = await db.all(
			`SELECT ae.id, ae.address, ae.delta_sats, ae.block_height, ae.time, ae.txid, ae.event_type,
				t.is_coinbase, t.is_coinstake,
				(ae.id = (
					SELECT MIN(e2.id) FROM address_events e2
					WHERE e2.chain_id = ae.chain_id AND e2.address = ae.address AND e2.txid = ae.txid
				)) AS is_first
			 FROM address_events ae
			 JOIN transactions t ON t.chain_id = ae.chain_id AND t.txid = ae.txid
			 WHERE ae.chain_id = ? AND ae.id > ? AND ae.block_height <= ?
			 ORDER BY ae.id ASC LIMIT ?`,
			[chain, wm, maxHeight, EVENT_BATCH]
		);

		if (batch.length === 0) {
			break;
		}

		await db.runTransaction(async (txdb) => {
			const statements = createPeriodStatStatements(txdb);
			const now = Date.now();
			for (const row of batch) {
				await recordAddressBalanceBucket(
					statements,
					chain,
					row.address,
					row.delta_sats,
					num(row.time),
					activityCategory(row),
					now
				);
				await recordAddressPeriodEvent(
					statements,
					chain,
					row.address,
					row.delta_sats,
					num(row.block_height),
					num(row.time),
					Boolean(row.is_first),
					now
				);
			}
		});

		wm = num(batch[batch.length - 1].id);
		processed += batch.length;
		await advanceState(db, chain, "address_stats", { lastEventId: wm });
		log(`${chain} address_stats: event_id<=${wm} (+${processed})`);
	}

	return processed;
}

// miner_stats: daily per-miner blocks_mined / mined_sats from coinbase outputs.
async function refreshMinerStats(db, chain, maxHeight) {
	const state = await getState(db, chain, "miner_stats");
	let wm = state ? num(state.last_height) : -1;
	let chunks = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);
		await db.run(
			`INSERT INTO miner_stats (chain_id, address, day_start, blocks_mined, mined_sats, last_height, updated_at)
			 SELECT t.chain_id,
					v.address,
					(b.time / 86400) * 86400,
					COUNT(DISTINCT t.block_height),
					SUM(v.value_sats),
					MAX(t.block_height),
					?
			 FROM transactions t
			 JOIN vouts v ON v.chain_id = t.chain_id AND v.txid = t.txid
			 JOIN blocks b ON b.chain_id = t.chain_id AND b.height = t.block_height AND b.status = 'main'
			 WHERE t.chain_id = ?
				AND t.is_coinbase = 1
				AND t.block_height > ? AND t.block_height <= ?
				AND t.block_height <> 1
				AND v.value_sats > 0
				AND v.address IS NOT NULL
			 GROUP BY t.chain_id, v.address, (b.time / 86400) * 86400
			 ON CONFLICT (chain_id, address, day_start) DO UPDATE SET
				blocks_mined = miner_stats.blocks_mined + excluded.blocks_mined,
				mined_sats = miner_stats.mined_sats + excluded.mined_sats,
				last_height = GREATEST(miner_stats.last_height, excluded.last_height),
				updated_at = excluded.updated_at`,
			[Date.now(), chain, wm, hi]
		);

		wm = hi;
		chunks += 1;
		await advanceState(db, chain, "miner_stats", { lastHeight: wm });
		log(`${chain} miner_stats: heights<=${wm}/${maxHeight}`);
	}

	return chunks;
}

async function main() {
	const chain = String(process.argv[2] || "").toLowerCase();
	if (!["vrm", "vrc"].includes(chain)) {
		console.error("Usage: node app/indexerV2/refreshAnalytics.js vrm|vrc");
		process.exit(1);
	}

	if (dbModule.getBackend() !== "postgres") {
		console.error("[refresh-analytics] requires VCEXP_DB_BACKEND=postgres");
		process.exit(1);
	}

	const db = dbModule.openDatabase(undefined, { skipSeed: true });
	const maxHeight = await getMaxHeight(db, chain);
	if (maxHeight < 0) {
		log(`${chain}: no indexed blocks, nothing to do`);
		return;
	}

	const startedAt = Date.now();
	log(`${chain}: refreshing analytics up to height ${maxHeight}`);

	const totals = await refreshBlockTotals(db, chain, maxHeight);
	const activity = await refreshChainActivity(db, chain, maxHeight);
	const addressStats = await refreshAddressStats(db, chain, maxHeight);
	const miners = await refreshMinerStats(db, chain, maxHeight);

	log(
		`${chain}: done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s `
		+ `(block_totals=${totals}, chain_activity_rows=${activity}, `
		+ `address_events=${addressStats}, miner_chunks=${miners})`
	);
}

if (require.main === module) {
	main()
		.then(() => {
			dbModule.closeDatabase();
		})
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}

module.exports = {
	refreshBlockTotals,
	refreshChainActivity,
	refreshAddressStats,
	refreshMinerStats
};
