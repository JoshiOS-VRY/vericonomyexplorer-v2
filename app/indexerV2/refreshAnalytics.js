#!/usr/bin/env node
"use strict";

// Watermark-driven, incremental analytics refresher (Postgres steady state).
//
// The indexers run with --index-only, so they write the core tables (blocks,
// transactions, vouts, vins, address_events, address_balances) but NOT the
// derived analytics (block totals, chain-activity buckets, address period
// stats, address balance buckets, miner rollup). This script folds only the
// rows newer than each rollup's persisted height watermark into those tables,
// so a cron tick is cheap and the first run seeds full history.
//
// Everything except the block-totals tail is set-based SQL chunked by height
// with ON CONFLICT (...) DO UPDATE += , which is exact-once per source row
// (each block height is processed in exactly one chunk) and produces identical
// results to the live ingest path (app/indexerV2/ingest.js):
//   * period received/sent/net are summed per address per calendar week/month,
//     tx_count = COUNT(DISTINCT txid) (== live's first-event-per-(addr,txid)),
//   * balance buckets sum magnitudes per category per hour,
//   * chain activity counts mined/staked/received txs + blocks per hour,
//   * miner_stats sums coinbase outputs per address per day.
// (The legacy backfillStats.js double-counts period amounts and is row-by-row;
// it is not used on the Postgres backend.)
//
// Usage: node app/indexerV2/refreshAnalytics.js vrm|vrc

require("./loadEnv.js");

const dbModule = require("./db.js");
const { toSafeInteger } = require("./periodStats.js");
const { computeBlockTotalsRawAsync } = require("./blockTotals.js");

const HEIGHT_CHUNK = Number(process.env.VCEXP_REFRESH_HEIGHT_CHUNK ?? 100000);
const BLOCK_TOTALS_BATCH = Number(process.env.VCEXP_REFRESH_TOTALS_BATCH ?? 2000);

// Unix timestamp (seconds) of the UTC week (Monday)/month start of a block
// time. AT TIME ZONE 'UTC' makes the truncation independent of session TZ and
// matches periodStats.getPeriodBoundsForTime.
const WEEK_START = "extract(epoch FROM date_trunc('week', to_timestamp(time) AT TIME ZONE 'UTC'))::bigint";
const WEEK_END = "extract(epoch FROM date_trunc('week', to_timestamp(time) AT TIME ZONE 'UTC') + interval '7 days')::bigint";
const MONTH_START = "extract(epoch FROM date_trunc('month', to_timestamp(time) AT TIME ZONE 'UTC'))::bigint";
const MONTH_END = "extract(epoch FROM date_trunc('month', to_timestamp(time) AT TIME ZONE 'UTC') + interval '1 month')::bigint";

function num(value) {
	return toSafeInteger(value);
}

function log(message) {
	process.stderr.write(`[refresh-analytics] ${message}\n`);
}

async function getMaxHeight(db, chain) {
	const row = await db.get(
		"SELECT MAX(height) AS h FROM blocks WHERE chain_id = ? AND status = 'main'",
		[chain]
	);
	return row && row.h != null ? num(row.h) : -1;
}

async function getWatermark(db, chain, rollup) {
	const row = await db.get(
		"SELECT last_height FROM rollup_state WHERE chain_id = ? AND rollup = ?",
		[chain, rollup]
	);
	return row && row.last_height != null ? num(row.last_height) : -1;
}

async function setWatermark(db, chain, rollup, lastHeight) {
	await db.run(
		`INSERT INTO rollup_state (chain_id, rollup, last_height, updated_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT (chain_id, rollup) DO UPDATE SET
			last_height = excluded.last_height,
			updated_at = excluded.updated_at`,
		[chain, rollup, lastHeight, Date.now()]
	);
}

// blocks.fee_sats / total_output_sats for blocks the indexer added in
// --index-only mode (NULL totals). The one-time bulk seed is the set-based
// backfill-block-totals.sql; here we only compute the NULL tail.
async function refreshBlockTotals(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "block_totals");
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
		await setWatermark(db, chain, "block_totals", wm);
	}

	await setWatermark(db, chain, "block_totals", maxHeight);
	return processed;
}

// chain_activity_buckets: per-hour mined/staked/received tx counts + block_count.
async function refreshChainActivity(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "chain_activity");
	let chunks = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);
		const now = Date.now();

		await db.run(
			`INSERT INTO chain_activity_buckets
				(chain_id, bucket_start, mined_count, staked_count, received_count, block_count, updated_at)
			 SELECT chain_id,
					(time / 3600) * 3600,
					SUM(CASE WHEN is_coinbase = 1 THEN 1 ELSE 0 END),
					SUM(CASE WHEN is_coinbase = 0 AND is_coinstake = 1 THEN 1 ELSE 0 END),
					SUM(CASE WHEN is_coinbase = 0 AND is_coinstake = 0 THEN 1 ELSE 0 END),
					0,
					?
			 FROM transactions
			 WHERE chain_id = ? AND block_height > ? AND block_height <= ? AND time IS NOT NULL
			 GROUP BY chain_id, (time / 3600) * 3600
			 ON CONFLICT (chain_id, bucket_start) DO UPDATE SET
				mined_count = chain_activity_buckets.mined_count + excluded.mined_count,
				staked_count = chain_activity_buckets.staked_count + excluded.staked_count,
				received_count = chain_activity_buckets.received_count + excluded.received_count,
				updated_at = excluded.updated_at`,
			[now, chain, wm, hi]
		);

		await db.run(
			`INSERT INTO chain_activity_buckets
				(chain_id, bucket_start, mined_count, staked_count, received_count, block_count, updated_at)
			 SELECT chain_id, (time / 3600) * 3600, 0, 0, 0, COUNT(*), ?
			 FROM blocks
			 WHERE chain_id = ? AND status = 'main' AND height > ? AND height <= ? AND time IS NOT NULL
			 GROUP BY chain_id, (time / 3600) * 3600
			 ON CONFLICT (chain_id, bucket_start) DO UPDATE SET
				block_count = chain_activity_buckets.block_count + excluded.block_count,
				updated_at = excluded.updated_at`,
			[now, chain, wm, hi]
		);

		wm = hi;
		chunks += 1;
		await setWatermark(db, chain, "chain_activity", wm);
		log(`${chain} chain_activity: heights<=${wm}/${maxHeight}`);
	}

	return chunks;
}

// address_period_stats (week+month) + address_balance_buckets (hourly) from
// new events. A txid lives in exactly one block height, so COUNT(DISTINCT txid)
// per chunk sums exactly across chunks.
async function refreshAddressStats(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "address_stats");
	let chunks = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);
		const now = Date.now();

		for (const period of [
			{ name: "week", start: WEEK_START, end: WEEK_END },
			{ name: "month", start: MONTH_START, end: MONTH_END }
		]) {
			await db.run(
				`INSERT INTO address_period_stats
					(chain_id, period, period_start, period_end, address,
					 received_sats, sent_sats, net_sats, tx_count,
					 last_seen_height, last_seen_time, updated_at)
				 SELECT chain_id,
						'${period.name}',
						${period.start},
						${period.end},
						address,
						SUM(CASE WHEN delta_sats > 0 THEN delta_sats ELSE 0 END),
						SUM(CASE WHEN delta_sats < 0 THEN -delta_sats ELSE 0 END),
						SUM(delta_sats),
						COUNT(DISTINCT txid),
						MAX(block_height),
						MAX(time),
						?
				 FROM address_events
				 WHERE chain_id = ? AND block_height > ? AND block_height <= ?
				 GROUP BY chain_id, address, ${period.start}, ${period.end}
				 ON CONFLICT (chain_id, period, period_start, address) DO UPDATE SET
					received_sats = address_period_stats.received_sats + excluded.received_sats,
					sent_sats = address_period_stats.sent_sats + excluded.sent_sats,
					net_sats = address_period_stats.net_sats + excluded.net_sats,
					tx_count = address_period_stats.tx_count + excluded.tx_count,
					last_seen_height = GREATEST(address_period_stats.last_seen_height, excluded.last_seen_height),
					last_seen_time = GREATEST(address_period_stats.last_seen_time, excluded.last_seen_time),
					updated_at = excluded.updated_at`,
				[now, chain, wm, hi]
			);
		}

		await db.run(
			`INSERT INTO address_balance_buckets
				(chain_id, address, bucket_start, mined_sats, staked_sats, received_sats, spent_sats, delta_sats, updated_at)
			 SELECT e.chain_id,
					e.address,
					(e.time / 3600) * 3600,
					SUM(CASE WHEN e.cat = 'mined' THEN e.mag ELSE 0 END),
					SUM(CASE WHEN e.cat = 'staked' THEN e.mag ELSE 0 END),
					SUM(CASE WHEN e.cat = 'received' THEN e.mag ELSE 0 END),
					SUM(CASE WHEN e.cat = 'spent' THEN e.mag ELSE 0 END),
					SUM(e.delta_sats),
					?
			 FROM (
				SELECT ae.chain_id, ae.address, ae.time, ae.delta_sats,
					ABS(ae.delta_sats) AS mag,
					CASE
						WHEN ae.event_type = 'spend' THEN 'spent'
						WHEN t.is_coinstake = 1 THEN 'staked'
						WHEN t.is_coinbase = 1 THEN 'mined'
						ELSE 'received'
					END AS cat
				FROM address_events ae
				JOIN transactions t ON t.chain_id = ae.chain_id AND t.txid = ae.txid
				WHERE ae.chain_id = ? AND ae.block_height > ? AND ae.block_height <= ?
			 ) e
			 GROUP BY e.chain_id, e.address, (e.time / 3600) * 3600
			 ON CONFLICT (chain_id, address, bucket_start) DO UPDATE SET
				mined_sats = address_balance_buckets.mined_sats + excluded.mined_sats,
				staked_sats = address_balance_buckets.staked_sats + excluded.staked_sats,
				received_sats = address_balance_buckets.received_sats + excluded.received_sats,
				spent_sats = address_balance_buckets.spent_sats + excluded.spent_sats,
				delta_sats = address_balance_buckets.delta_sats + excluded.delta_sats,
				updated_at = excluded.updated_at`,
			[now, chain, wm, hi]
		);

		wm = hi;
		chunks += 1;
		await setWatermark(db, chain, "address_stats", wm);
		log(`${chain} address_stats: heights<=${wm}/${maxHeight}`);
	}

	return chunks;
}

// miner_stats: daily per-miner blocks_mined / mined_sats from coinbase outputs.
async function refreshMinerStats(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "miner_stats");
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
		await setWatermark(db, chain, "miner_stats", wm);
		log(`${chain} miner_stats: heights<=${wm}/${maxHeight}`);
	}

	return chunks;
}

// block_mint: per-height coin issuance + running total. mint_sats = coinbase
// outputs (PoW) or coinstake (outputs - resolved inputs, when positive) (PoS).
// cumulative_sats is the running total seeded from the prior chunk's tail, so
// circulating supply at any height is an indexed `height <= H ORDER BY height
// DESC LIMIT 1`. Computed set-based with grouped CTEs (no correlated subqueries).
async function refreshBlockMint(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "block_mint");
	let chunks = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);

		const baseRow = await db.get(
			`SELECT cumulative_sats FROM block_mint
			 WHERE chain_id = ? AND height <= ?
			 ORDER BY height DESC LIMIT 1`,
			[chain, wm]
		);
		const base = baseRow && baseRow.cumulative_sats != null
			? BigInt(baseRow.cumulative_sats).toString()
			: "0";

		await db.run(
			`INSERT INTO block_mint (chain_id, height, mint_sats, cumulative_sats)
			 WITH txs AS (
				SELECT txid, block_height AS height, is_coinbase, is_coinstake
				FROM transactions
				WHERE chain_id = ? AND block_height > ? AND block_height <= ?
					AND (is_coinbase = 1 OR is_coinstake = 1)
			 ),
			 outs AS (
				SELECT v.txid, SUM(v.value_sats) AS out_sats
				FROM vouts v JOIN txs ON txs.txid = v.txid
				WHERE v.chain_id = ?
				GROUP BY v.txid
			 ),
			 ins AS (
				SELECT vi.txid, SUM(vi.value_sats) AS in_sats
				FROM vins vi JOIN txs ON txs.txid = vi.txid
				WHERE vi.chain_id = ? AND vi.resolved = 1
				GROUP BY vi.txid
			 ),
			 per_height AS (
				SELECT txs.height,
					SUM(CASE
						WHEN txs.is_coinbase = 1 THEN COALESCE(outs.out_sats, 0)
						WHEN txs.is_coinstake = 1 AND COALESCE(outs.out_sats, 0) > COALESCE(ins.in_sats, 0)
							THEN outs.out_sats - ins.in_sats
						ELSE 0
					END)::bigint AS mint_sats
				FROM txs
				LEFT JOIN outs ON outs.txid = txs.txid
				LEFT JOIN ins ON ins.txid = txs.txid
				GROUP BY txs.height
			 ),
			 pos AS (
				SELECT height, mint_sats FROM per_height WHERE mint_sats > 0
			 )
			 SELECT ?::text, height, mint_sats,
					(?::bigint + SUM(mint_sats) OVER (ORDER BY height ROWS UNBOUNDED PRECEDING))::bigint
			 FROM pos
			 ORDER BY height
			 ON CONFLICT (chain_id, height) DO UPDATE SET
				mint_sats = excluded.mint_sats,
				cumulative_sats = excluded.cumulative_sats`,
			[chain, wm, hi, chain, chain, chain, base]
		);

		wm = hi;
		chunks += 1;
		await setWatermark(db, chain, "block_mint", wm);
		log(`${chain} block_mint: heights<=${wm}/${maxHeight}`);
	}

	return chunks;
}

// network_metric_buckets.supply from block_mint: each hour bucket's supply is
// the running total at the last main-chain block in that hour. Set-based; runs
// after refreshBlockMint so the lookup always finds a covering row.
async function refreshSupplyBuckets(db, chain, maxHeight) {
	let wm = await getWatermark(db, chain, "supply_buckets");
	let chunks = 0;

	while (wm < maxHeight) {
		const hi = Math.min(wm + HEIGHT_CHUNK, maxHeight);
		const now = Date.now();

		await db.run(
			`INSERT INTO network_metric_buckets (chain_id, bucket_start, supply, updated_at)
			 SELECT lb.chain_id, lb.bucket_start, (s.cumulative_sats::numeric / 100000000.0), ?
			 FROM (
				SELECT DISTINCT ON ((time / 3600) * 3600)
					chain_id, (time / 3600) * 3600 AS bucket_start, height
				FROM blocks
				WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
					AND height > ? AND height <= ?
				ORDER BY (time / 3600) * 3600, height DESC
			 ) lb
			 JOIN LATERAL (
				SELECT cumulative_sats FROM block_mint bm
				WHERE bm.chain_id = lb.chain_id AND bm.height <= lb.height
				ORDER BY bm.height DESC LIMIT 1
			 ) s ON true
			 ON CONFLICT (chain_id, bucket_start) DO UPDATE SET
				supply = excluded.supply,
				updated_at = excluded.updated_at`,
			[now, chain, wm, hi]
		);

		wm = hi;
		chunks += 1;
		await setWatermark(db, chain, "supply_buckets", wm);
		log(`${chain} supply_buckets: heights<=${wm}/${maxHeight}`);
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
	const mint = await refreshBlockMint(db, chain, maxHeight);
	const supply = await refreshSupplyBuckets(db, chain, maxHeight);

	log(
		`${chain}: done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s `
		+ `(block_totals=${totals}, chain_activity_chunks=${activity}, `
		+ `address_chunks=${addressStats}, miner_chunks=${miners}, `
		+ `block_mint_chunks=${mint}, supply_chunks=${supply})`
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
	refreshMinerStats,
	refreshBlockMint,
	refreshSupplyBuckets
};
