"use strict";

const HOUR_SECONDS = 3600;

function toSafeInteger(value) {
	const parsed = typeof value === "bigint" ? Number(value) : Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function hourBucketStart(time) {
	const normalized = toSafeInteger(time);
	if (!normalized) {
		return 0;
	}

	return Math.floor(normalized / HOUR_SECONDS) * HOUR_SECONDS;
}

function getPeriodBoundsForTime(period, timeSeconds) {
	const seconds = toSafeInteger(timeSeconds);
	const now = new Date(seconds * 1000);
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

	if (period === "month") {
		start.setUTCDate(1);
	} else {
		const day = start.getUTCDay();
		const daysSinceMonday = (day + 6) % 7;
		start.setUTCDate(start.getUTCDate() - daysSinceMonday);
	}

	const end = new Date(start.getTime());
	if (period === "month") {
		end.setUTCMonth(end.getUTCMonth() + 1);
	} else {
		end.setUTCDate(end.getUTCDate() + 7);
	}

	return {
		period,
		periodStart: Math.floor(start.getTime() / 1000),
		periodEnd: Math.floor(end.getTime() / 1000)
	};
}

function createPeriodStatStatements(db) {
	return {
		upsertPeriodStat: db.prepare(`
			INSERT INTO address_period_stats (
				chain_id, period, period_start, period_end, address,
				received_sats, sent_sats, net_sats, tx_count,
				last_seen_height, last_seen_time, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, period, period_start, address) DO UPDATE SET
				received_sats = received_sats + excluded.received_sats,
				sent_sats = sent_sats + excluded.sent_sats,
				net_sats = net_sats + excluded.net_sats,
				tx_count = tx_count + excluded.tx_count,
				last_seen_height = excluded.last_seen_height,
				last_seen_time = excluded.last_seen_time,
				updated_at = excluded.updated_at
		`),

		upsertActivityBucket: db.prepare(`
			INSERT INTO chain_activity_buckets (
				chain_id, bucket_start, mined_count, staked_count, received_count, block_count, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, bucket_start) DO UPDATE SET
				mined_count = mined_count + excluded.mined_count,
				staked_count = staked_count + excluded.staked_count,
				received_count = received_count + excluded.received_count,
				block_count = block_count + excluded.block_count,
				updated_at = excluded.updated_at
		`),

		upsertAddressBalanceBucket: db.prepare(`
			INSERT INTO address_balance_buckets (
				chain_id, address, bucket_start,
				mined_sats, staked_sats, received_sats, spent_sats, delta_sats, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, address, bucket_start) DO UPDATE SET
				mined_sats = mined_sats + excluded.mined_sats,
				staked_sats = staked_sats + excluded.staked_sats,
				received_sats = received_sats + excluded.received_sats,
				spent_sats = spent_sats + excluded.spent_sats,
				delta_sats = delta_sats + excluded.delta_sats,
				updated_at = excluded.updated_at
		`)
	};
}

function recordAddressPeriodEvent(statements, chainId, address, deltaSats, blockHeight, blockTime, txCountIncrement, now) {
	if (!address) {
		return;
	}

	const delta = BigInt(deltaSats || 0);
	const received = delta > 0n ? delta : 0n;
	const sent = delta < 0n ? -delta : 0n;
	const periods = ["week", "month"];

	for (const period of periods) {
		const bounds = getPeriodBoundsForTime(period, blockTime || Math.floor(now / 1000));
		statements.upsertPeriodStat.run(
			chainId,
			bounds.period,
			bounds.periodStart,
			bounds.periodEnd,
			address,
			received,
			sent,
			delta,
			txCountIncrement ? 1 : 0,
			toSafeInteger(blockHeight),
			toSafeInteger(blockTime),
			now
		);
	}
}

function recordTransactionActivity(statements, chainId, blockTime, isCoinbase, isCoinstake, now) {
	const bucketStart = hourBucketStart(blockTime);
	if (!bucketStart) {
		return;
	}

	let minedCount = 0;
	let stakedCount = 0;
	let receivedCount = 0;

	if (isCoinbase) {
		minedCount = 1;
	} else if (isCoinstake) {
		stakedCount = 1;
	} else {
		receivedCount = 1;
	}

	statements.upsertActivityBucket.run(
		chainId,
		bucketStart,
		minedCount,
		stakedCount,
		receivedCount,
		0,
		now
	);
}

function recordBlockActivity(statements, chainId, blockTime, now) {
	const bucketStart = hourBucketStart(blockTime);
	if (!bucketStart) {
		return;
	}

	statements.upsertActivityBucket.run(chainId, bucketStart, 0, 0, 0, 1, now);
}

function recordAddressBalanceBucket(statements, chainId, address, deltaSats, blockTime, category, now) {
	if (!address) {
		return;
	}

	const bucketStart = hourBucketStart(blockTime);
	if (!bucketStart) {
		return;
	}

	const delta = BigInt(deltaSats || 0);
	const magnitude = delta < 0n ? -delta : delta;
	const mined = category === "mined" ? magnitude : 0n;
	const staked = category === "staked" ? magnitude : 0n;
	const received = category === "received" ? magnitude : 0n;
	const spent = category === "spent" ? magnitude : 0n;

	statements.upsertAddressBalanceBucket.run(
		chainId,
		address,
		bucketStart,
		mined,
		staked,
		received,
		spent,
		delta,
		now
	);
}

module.exports = {
	createPeriodStatStatements,
	recordAddressPeriodEvent,
	recordAddressBalanceBucket,
	recordTransactionActivity,
	recordBlockActivity,
	hourBucketStart,
	getPeriodBoundsForTime,
	toSafeInteger
};
