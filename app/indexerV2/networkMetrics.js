"use strict";

const { hourBucketStart } = require("./periodStats.js");
const { buildSupplySeries, supplyAtHeight } = require("./supplyHistory.js");
const {
	loadAddressFirstSeenTimes,
	resolveAddressGrowthRange,
	addressCountAtBucketEnd
} = require("./addressGrowth.js");
const { yieldToReaders } = require("./yield.js");
const veriumCoin = require("../coins/verium.js");
const Decimal = require("decimal.js");

const NETWORK = "main";
const HOUR_SECONDS = 3600;

function createNetworkMetricStatements(db) {
	return {
		upsertBucket: db.prepare(`
			INSERT INTO network_metric_buckets (
				chain_id, bucket_start, difficulty, block_height, supply,
				hashrate_kh_per_min, interest_rate_percent, net_stake_weight,
				percent_staked, expected_stake_time_seconds, address_count, updated_at
			) VALUES (
				@chain_id, @bucket_start, @difficulty, @block_height, @supply,
				@hashrate_kh_per_min, @interest_rate_percent, @net_stake_weight,
				@percent_staked, @expected_stake_time_seconds, @address_count, @updated_at
			)
			ON CONFLICT(chain_id, bucket_start) DO UPDATE SET
				difficulty = COALESCE(excluded.difficulty, network_metric_buckets.difficulty),
				block_height = COALESCE(excluded.block_height, network_metric_buckets.block_height),
				supply = COALESCE(excluded.supply, network_metric_buckets.supply),
				hashrate_kh_per_min = COALESCE(excluded.hashrate_kh_per_min, network_metric_buckets.hashrate_kh_per_min),
				interest_rate_percent = COALESCE(excluded.interest_rate_percent, network_metric_buckets.interest_rate_percent),
				net_stake_weight = COALESCE(excluded.net_stake_weight, network_metric_buckets.net_stake_weight),
				percent_staked = COALESCE(excluded.percent_staked, network_metric_buckets.percent_staked),
				expected_stake_time_seconds = COALESCE(excluded.expected_stake_time_seconds, network_metric_buckets.expected_stake_time_seconds),
				address_count = COALESCE(excluded.address_count, network_metric_buckets.address_count),
				updated_at = excluded.updated_at
		`)
	};
}

function getBackfillWriteBatchSize() {
	const configured = Number(process.env.VCEXP_BACKFILL_WRITE_BATCH ?? 250);
	return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 250;
}

async function writeBucketBatch(db, chainId, bucketEntries, options = {}) {
	const {
		supplySeries,
		addressFirstSeenTimes,
		sampleEveryHours
	} = options;
	let bucketsWritten = 0;

	await db.runTransaction(async (txdb) => {
		const statements = createNetworkMetricStatements(txdb);
		for (const [bucketStart, bucket] of bucketEntries) {
			if (sampleEveryHours > 1 && (bucketStart / HOUR_SECONDS) % sampleEveryHours !== 0) {
				continue;
			}

			const metrics = {
				bucketStart,
				blockHeight: bucket.blockHeight,
				difficulty: bucket.difficulty
			};

			if (supplySeries) {
				const indexedSupply = supplyAtHeight(supplySeries, bucket.blockHeight);
				if (indexedSupply != null) {
					metrics.supply = indexedSupply;
				}
			}

			if (addressFirstSeenTimes.length > 0) {
				metrics.addressCount = addressCountAtBucketEnd(addressFirstSeenTimes, bucketStart);
			}

			if (chainId === "vrm" && bucket.difficulty != null) {
				const hashPerSec = difficultyToHashPerSec(bucket.difficulty, chainId);
				if (hashPerSec != null) {
					metrics.hashrateKhPerMin = hashPerSecToKhPerMin(hashPerSec);
				}
			}

			await statements.upsertBucket.run({
				chain_id: chainId,
				bucket_start: metrics.bucketStart,
				difficulty: metrics.difficulty,
				block_height: metrics.blockHeight,
				supply: metrics.supply ?? null,
				hashrate_kh_per_min: metrics.hashrateKhPerMin ?? null,
				interest_rate_percent: null,
				net_stake_weight: null,
				percent_staked: null,
				expected_stake_time_seconds: null,
				address_count: metrics.addressCount ?? null,
				updated_at: Date.now()
			});
			bucketsWritten += 1;
		}
	});

	return bucketsWritten;
}

async function upsertNetworkMetricBucket(db, chainId, metrics) {
	const statements = createNetworkMetricStatements(db);
	const now = Date.now();
	const bucketStart = metrics.bucketStart ?? hourBucketStart(Math.floor(now / 1000));

	await statements.upsertBucket.run({
		chain_id: chainId,
		bucket_start: bucketStart,
		difficulty: metrics.difficulty ?? null,
		block_height: metrics.blockHeight ?? null,
		supply: metrics.supply ?? null,
		hashrate_kh_per_min: metrics.hashrateKhPerMin ?? null,
		interest_rate_percent: metrics.interestRatePercent ?? null,
		net_stake_weight: metrics.netStakeWeight ?? null,
		percent_staked: metrics.percentStaked ?? null,
		expected_stake_time_seconds: metrics.expectedStakeTimeSeconds ?? null,
		address_count: metrics.addressCount ?? null,
		updated_at: now
	});
}

function getTargetBlockTimeSeconds(chainId) {
	if (chainId === "vrm") {
		return veriumCoin.targetBlockTimeSeconds ?? 600;
	}
	return 60;
}

function difficultyToHashPerSec(difficulty, chainId) {
	const parsed = Number(difficulty);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}
	const targetBlockTimeSeconds = getTargetBlockTimeSeconds(chainId);
	return (parsed * 2 ** 32) / targetBlockTimeSeconds;
}

function hashPerSecToKhPerMin(hashPerSec) {
	return (hashPerSec * 60) / 1000;
}

function toSafeNumber(value) {
	if (typeof value === "bigint") {
		return Number(value);
	}
	return Number(value);
}

function estimatedSupplyAtHeight(height) {
	const safeHeight = toSafeNumber(height);
	const checkpoint = veriumCoin.utxoSetCheckpointsByNetwork?.[NETWORK];
	let checkpointHeight = 0;
	let checkpointSupply = new Decimal(50);

	if (checkpoint && checkpoint.height <= safeHeight) {
		checkpointHeight = checkpoint.height;
		checkpointSupply = new Decimal(checkpoint.total_amount);
	}

	const halvingBlockInterval = veriumCoin.halvingBlockIntervalsByNetwork?.[NETWORK] ?? 210000;
	let supply = checkpointSupply;
	let i = checkpointHeight;

	while (i < safeHeight) {
		const nextHalvingHeight =
			halvingBlockInterval * Math.floor(i / halvingBlockInterval) + halvingBlockInterval;

		if (safeHeight < nextHalvingHeight) {
			const heightDiff = safeHeight - i;
			const reward = veriumCoin.blockRewardFunction(i, NETWORK);
			return Number(supply.plus(new Decimal(heightDiff).times(reward)).toString());
		}

		const heightDiff = nextHalvingHeight - i;
		const reward = veriumCoin.blockRewardFunction(i, NETWORK);
		supply = supply.plus(new Decimal(heightDiff).times(reward));
		i += heightDiff;
	}

	return Number(supply.toString());
}

async function backfillFromBlocks(db, chainId, options = {}) {
	const since = options.since ?? null;
	const sampleEveryHours = Number(options.sampleEveryHours ?? 1);

	const blockParams = [chainId];
	let blockSql = `
		SELECT height, time, difficulty
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
	`;
	if (since != null) {
		blockSql += " AND time >= ?";
		blockParams.push(since);
	}
	blockSql += " ORDER BY height ASC";

	const rows = await db.all(blockSql, blockParams);

	if (!rows.length) {
		return { chainId, bucketsWritten: 0 };
	}

	const supplySeries = options.skipSupplySeries === true ? null : await buildSupplySeries(db, chainId);
	const addressFirstSeenTimes = await loadAddressFirstSeenTimes(db, chainId);
	const buckets = new Map();
	for (const row of rows) {
		const bucketStart = hourBucketStart(toSafeNumber(row.time));
		const existing = buckets.get(bucketStart);
		const difficulty = row.difficulty == null ? null : Number(row.difficulty);

		if (!existing || toSafeNumber(row.height) >= toSafeNumber(existing.blockHeight)) {
			buckets.set(bucketStart, {
				blockHeight: toSafeNumber(row.height),
				difficulty: Number.isFinite(difficulty) ? difficulty : existing?.difficulty ?? null,
				time: toSafeNumber(row.time)
			});
		}
	}

	let bucketsWritten = 0;
	const bucketEntries = [...buckets.entries()];
	const writeBatchSize = getBackfillWriteBatchSize();

	for (let index = 0; index < bucketEntries.length; index += writeBatchSize) {
		const slice = bucketEntries.slice(index, index + writeBatchSize);
		bucketsWritten += await writeBucketBatch(db, chainId, slice, {
			supplySeries,
			addressFirstSeenTimes,
			sampleEveryHours
		});
		await yieldToReaders();
	}

	return {
		chainId,
		bucketsWritten,
		firstBucket: buckets.size ? Math.min(...buckets.keys()) : null,
		addressesTracked: addressFirstSeenTimes.length
	};
}

/**
 * Backfill cumulative address_count into network_metric_buckets (historical growth curve).
 * Does not require block scans or supply recomputation.
 */
async function backfillAddressGrowth(db, chainId, options = {}) {
	const since = options.since ?? null;
	const sampleEveryHours = Number(options.sampleEveryHours ?? 1);
	const addressFirstSeenTimes = await loadAddressFirstSeenTimes(db, chainId);

	if (!addressFirstSeenTimes.length) {
		return { chainId, bucketsWritten: 0, addressesTracked: 0 };
	}

	const { rangeStart, rangeEnd } = await resolveAddressGrowthRange(db, chainId, options);
	let startBucket = rangeStart;
	if (since != null) {
		startBucket = Math.max(startBucket, hourBucketStart(since));
	}

	let bucketsWritten = 0;
	const writeBatchSize = getBackfillWriteBatchSize();
	const bucketStarts = [];

	for (let bucketStart = startBucket; bucketStart <= rangeEnd; bucketStart += HOUR_SECONDS * sampleEveryHours) {
		if (sampleEveryHours > 1 && (bucketStart / HOUR_SECONDS) % sampleEveryHours !== 0) {
			continue;
		}
		bucketStarts.push(bucketStart);
	}

	for (let index = 0; index < bucketStarts.length; index += writeBatchSize) {
		const slice = bucketStarts.slice(index, index + writeBatchSize);
		await db.runTransaction(async (txdb) => {
			for (const bucketStart of slice) {
				await upsertNetworkMetricBucket(txdb, chainId, {
					bucketStart,
					addressCount: addressCountAtBucketEnd(addressFirstSeenTimes, bucketStart)
				});
				bucketsWritten += 1;
			}
		});
		await yieldToReaders();
	}

	return {
		chainId,
		bucketsWritten,
		rangeStart: startBucket,
		rangeEnd,
		addressesTracked: addressFirstSeenTimes.length
	};
}

module.exports = {
	upsertNetworkMetricBucket,
	backfillFromBlocks,
	backfillAddressGrowth,
	difficultyToHashPerSec,
	hashPerSecToKhPerMin,
	getTargetBlockTimeSeconds,
	estimatedSupplyAtHeight
};
