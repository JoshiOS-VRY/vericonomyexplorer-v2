"use strict";

const dbModule = require("./db.js");
const health = require("./health.js");
const utils = require("../utils.js");
const { atomicUnitsToDecimal } = require("./valueUtils.js");

const defaultLimit = 25;
const maxLimit = 100;
const defaultBalanceHistoryPoints = 120;
const maxBalanceHistoryPoints = 500;
const maxBalanceHistoryEvents = 50000;

const stmtCache = new Map();

function prepare(db, sql) {
	if (!stmtCache.has(sql)) {
		stmtCache.set(sql, db.prepare(sql));
	}

	return stmtCache.get(sql);
}

const ADDRESS_UTXO_UNSPENT_SQL = `
	SELECT
		vouts.txid,
		vouts.n,
		vouts.value_sats,
		transactions.block_height,
		transactions.time
	FROM vouts
	JOIN transactions
		ON transactions.chain_id = vouts.chain_id
		AND transactions.txid = vouts.txid
	WHERE vouts.chain_id = ?
		AND vouts.is_spent = 0
		AND vouts.address = ?
	UNION
	SELECT
		vouts.txid,
		vouts.n,
		vouts.value_sats,
		transactions.block_height,
		transactions.time
	FROM vout_addresses
	JOIN vouts
		ON vouts.chain_id = vout_addresses.chain_id
		AND vouts.txid = vout_addresses.txid
		AND vouts.n = vout_addresses.n
	JOIN transactions
		ON transactions.chain_id = vouts.chain_id
		AND transactions.txid = vouts.txid
	WHERE vout_addresses.chain_id = ?
		AND vout_addresses.address = ?
		AND vouts.is_spent = 0
		AND (vouts.address IS NULL OR vouts.address != ?)
`;

const ADDRESS_UTXO_ROWS_SQL = `
	WITH unspent AS (${ADDRESS_UTXO_UNSPENT_SQL})
	SELECT txid, n, value_sats, block_height, time
	FROM unspent
	ORDER BY value_sats DESC, txid ASC, n ASC
	LIMIT ? OFFSET ?
`;

const ADDRESS_UTXO_SUMMARY_SQL = `
	WITH unspent AS (${ADDRESS_UTXO_UNSPENT_SQL})
	SELECT COUNT(*) AS count, COALESCE(SUM(value_sats), 0) AS total_sats
	FROM unspent
`;

const chainUnits = {
	vrc: {
		ticker: "VRC",
		decimalPlaces: 8
	},
	vrm: {
		ticker: "VRM",
		decimalPlaces: 8
	}
};

function getChainSummary(chainId, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const chainHealth = health.getChainHealth(chain, { db });
	const latestBlocks = db.prepare(`
		SELECT height, hash, previous_hash, time, tx_count, size, difficulty
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
		ORDER BY height DESC
		LIMIT 10
	`).all(chain).map(block => mapBlock(block));
	const enrichedLatestBlocks = enrichLatestBlocks(db, chain, latestBlocks);
	const recentTransactions = db.prepare(`
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ?
		ORDER BY block_height DESC, tx_index DESC
		LIMIT 25
	`).all(chain).map(tx => mapTransaction(tx));

	return {
		chainId: chain,
		health: chainHealth,
		latestBlocks: enrichedLatestBlocks,
		recentTransactions,
		source: getSource(chainHealth, "summary")
	};
}

function getRichlist(chainId, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const limit = normalizeLimit(options.limit);
	const offset = normalizeOffset(options.offset);
	const chainHealth = health.getChainHealth(chain, { db });

	if (!chainHealth.checks.hasBlocks) {
		return disabledResponse(chain, chainHealth, "richlist");
	}

	const rows = db.prepare(`
		SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count, last_seen_height
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
		ORDER BY balance_sats DESC, address ASC
		LIMIT ? OFFSET ?
	`).all(chain, limit, offset);
	const countRow = db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
	`).get(chain);

	return {
		chainId: chain,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "richlist"),
		paging: getPaging(limit, offset, countRow.count),
		items: rows.map((row, index) => Object.assign({
			rank: offset + index + 1
		}, mapAddressBalanceCore(chain, row)))
	};
}

function getLeaderboard(chainId, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const limit = normalizeLimit(options.limit);
	const offset = normalizeOffset(options.offset);
	const period = normalizePeriod(options.period);
	const sort = normalizeLeaderboardSort(options.sort);
	const chainHealth = health.getChainHealth(chain, { db });

	if (!chainHealth.checks.hasBlocks) {
		return disabledResponse(chain, chainHealth, "leaderboards");
	}

	const periodBounds = getPeriodBounds(period, options.now);
	const orderColumn = {
		received: "received_sats",
		sent: "sent_sats",
		net: "net_sats",
		activity: "tx_count"
	}[sort];

	const statsCountRow = db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_period_stats
		WHERE chain_id = ? AND period = ? AND period_start = ?
			AND (received_sats > 0 OR sent_sats > 0)
	`).get(chain, periodBounds.type, periodBounds.start);

	if (statsCountRow.count > 0) {
		const rows = db.prepare(`
			SELECT
				address,
				received_sats,
				sent_sats,
				net_sats,
				tx_count,
				last_seen_height,
				last_seen_time
			FROM address_period_stats
			WHERE chain_id = ? AND period = ? AND period_start = ?
				AND (received_sats > 0 OR sent_sats > 0)
			ORDER BY ${orderColumn} DESC, address ASC
			LIMIT ? OFFSET ?
		`).all(chain, periodBounds.type, periodBounds.start, limit, offset);

		return {
			chainId: chain,
			trusted: chainHealth.trusted,
			source: getSource(chainHealth, "leaderboards"),
			period: periodBounds,
			sort,
			label: "Indexed transfer activity",
			paging: getPaging(limit, offset, statsCountRow.count),
			items: rows.map((row, index) => ({
				rank: offset + index + 1,
				address: row.address,
				receivedAtomic: stringifyInteger(row.received_sats),
				received: formatAtomic(chain, row.received_sats),
				sentAtomic: stringifyInteger(row.sent_sats),
				sent: formatAtomic(chain, row.sent_sats),
				netAtomic: stringifyInteger(row.net_sats),
				net: formatAtomic(chain, row.net_sats),
				txCount: toNumber(row.tx_count),
				lastSeenHeight: toNullableNumber(row.last_seen_height),
				lastSeenTime: toNullableNumber(row.last_seen_time)
			}))
		};
	}

	const rows = db.prepare(`
		SELECT
			address,
			SUM(CASE WHEN delta_sats > 0 THEN delta_sats ELSE 0 END) AS received_sats,
			SUM(CASE WHEN delta_sats < 0 THEN ABS(delta_sats) ELSE 0 END) AS sent_sats,
			SUM(delta_sats) AS net_sats,
			COUNT(DISTINCT txid) AS tx_count,
			MAX(block_height) AS last_seen_height,
			MAX(time) AS last_seen_time
		FROM address_events
		WHERE chain_id = ? AND time >= ? AND time < ?
		GROUP BY address
		HAVING received_sats > 0 OR sent_sats > 0
		ORDER BY ${orderColumn} DESC, address ASC
		LIMIT ? OFFSET ?
	`).all(chain, periodBounds.start, periodBounds.end, limit, offset);
	const countRow = db.prepare(`
		SELECT COUNT(*) AS count
		FROM (
			SELECT address
			FROM address_events
			WHERE chain_id = ? AND time >= ? AND time < ?
			GROUP BY address
		)
	`).get(chain, periodBounds.start, periodBounds.end);

	return {
		chainId: chain,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "leaderboards"),
		period: periodBounds,
		sort,
		label: "Indexed transfer activity",
		paging: getPaging(limit, offset, countRow.count),
		items: rows.map((row, index) => ({
			rank: offset + index + 1,
			address: row.address,
			receivedAtomic: stringifyInteger(row.received_sats),
			received: formatAtomic(chain, row.received_sats),
			sentAtomic: stringifyInteger(row.sent_sats),
			sent: formatAtomic(chain, row.sent_sats),
			netAtomic: stringifyInteger(row.net_sats),
			net: formatAtomic(chain, row.net_sats),
			txCount: toNumber(row.tx_count),
			lastSeenHeight: toNullableNumber(row.last_seen_height),
			lastSeenTime: toNullableNumber(row.last_seen_time)
		}))
	};
}

function getAddress(chainId, address, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const cleanAddress = normalizeAddress(address);
	const limit = normalizeLimit(options.limit);
	const offset = normalizeOffset(options.offset);
	const chainHealth = health.getChainHealth(chain, { db });
	const balanceRow = prepare(db, `
		SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count, last_seen_height
		FROM address_balances
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const txRows = prepare(db, `
		SELECT
			address_transactions.txid,
			address_transactions.first_seen_height,
			address_transactions.first_seen_time,
			transactions.block_hash,
			transactions.tx_index,
			transactions.is_coinbase,
			transactions.is_coinstake,
			SUM(address_events.delta_sats) AS net_delta_sats
		FROM address_transactions
		JOIN transactions
			ON transactions.chain_id = address_transactions.chain_id
			AND transactions.txid = address_transactions.txid
		LEFT JOIN address_events
			ON address_events.chain_id = address_transactions.chain_id
			AND address_events.address = address_transactions.address
			AND address_events.txid = address_transactions.txid
		WHERE address_transactions.chain_id = ? AND address_transactions.address = ?
		GROUP BY
			address_transactions.txid,
			address_transactions.first_seen_height,
			address_transactions.first_seen_time,
			transactions.block_hash,
			transactions.tx_index,
			transactions.is_coinbase,
			transactions.is_coinstake
		ORDER BY address_transactions.first_seen_height DESC, transactions.tx_index DESC
		LIMIT ? OFFSET ?
	`).all(chain, cleanAddress, limit, offset);
	const countRow = prepare(db, `
		SELECT COUNT(*) AS count
		FROM address_transactions
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const firstSeenRow = prepare(db, `
		SELECT MIN(first_seen_height) AS first_seen_height, MIN(first_seen_time) AS first_seen_time
		FROM address_transactions
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const balance = balanceRow
		? mapAddressBalance(chain, balanceRow, firstSeenRow)
		: emptyAddressBalance(chain, cleanAddress, firstSeenRow);

	return {
		chainId: chain,
		address: cleanAddress,
		found: !!balanceRow,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "address"),
		balance,
		richlist: getAddressRichlist(db, chain, chainHealth, balanceRow),
		paging: getPaging(limit, offset, countRow.count),
		transactions: txRows.map(row => mapAddressTransaction(chain, row))
	};
}

function getAddressRichlist(db, chain, chainHealth, balanceRow) {
	if (!chainHealth.checks.hasBlocks) {
		return {
			enabled: false,
			eligible: false,
			rank: null,
			total: 0,
			percentile: null
		};
	}

	const total = toNumber(db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
	`).get(chain).count);

	if (!balanceRow || toBigInt(balanceRow.balance_sats) <= 0n) {
		return {
			enabled: true,
			eligible: false,
			rank: null,
			total,
			percentile: null
		};
	}

	const rankRow = db.prepare(`
		SELECT COUNT(*) + 1 AS rank
		FROM address_balances
		WHERE chain_id = ? AND balance_sats > 0
			AND (
				balance_sats > ?
				OR (balance_sats = ? AND address < ?)
			)
	`).get(chain, balanceRow.balance_sats, balanceRow.balance_sats, balanceRow.address);
	const rank = toNumber(rankRow.rank);
	const percentile = total > 0 ? rank / total : null;

	return {
		enabled: true,
		eligible: true,
		rank,
		total,
		percentile
	};
}

const addressActivityCategories = [
	{ id: "mined", label: "Mined" },
	{ id: "staked", label: "Staked" },
	{ id: "received", label: "Received" },
	{ id: "spent", label: "Spent" }
];

const chainActivityCategories = [
	{ id: "mined", label: "Mined" },
	{ id: "staked", label: "Staked" },
	{ id: "received", label: "Transfers" }
];

function getAddressActivityCategory(row) {
	if (row.event_type === "spend") {
		return "spent";
	}

	if (toNumber(row.is_coinstake)) {
		return "staked";
	}

	if (toNumber(row.is_coinbase)) {
		return "mined";
	}

	return "received";
}

function getTxActivityCategory(row) {
	if (toNumber(row.is_coinstake)) {
		return "staked";
	}

	if (toNumber(row.is_coinbase)) {
		return "mined";
	}

	return "received";
}

function resolveActivityBucketCount(since, maxPoints, firstTime, lastTime) {
	const now = Math.floor(Date.now() / 1000);
	const end = Math.max(lastTime || now, since || 0);
	const start = since || firstTime || end;
	const span = Math.max(end - start, 1);

	if (!since) {
		return Math.min(Math.max(maxPoints, 8), 24);
	}

	const days = Math.max(Math.ceil(span / 86_400), 1);

	if (span <= 8 * 86_400) {
		return Math.min(days, 7);
	}

	if (span <= 32 * 86_400) {
		return Math.min(days, 30);
	}

	if (span <= 95 * 86_400) {
		return Math.min(Math.ceil(days / 7), 14);
	}

	return Math.min(12, maxPoints);
}

function buildActivityBucketPlan(since, maxPoints, firstTime, lastTime) {
	const now = Math.floor(Date.now() / 1000);
	const end = Math.max(lastTime || now, since || 0, firstTime || 0);
	const start = since || firstTime || end;
	const bucketCount = Math.max(resolveActivityBucketCount(since, maxPoints, firstTime, lastTime), 1);
	const span = Math.max(end - start, 1);
	const step = Math.max(Math.floor(span / bucketCount), 1);
	const buckets = [];

	for (let index = 0; index < bucketCount; index += 1) {
		const bucketStart = index === 0
			? start
			: start + index * step;
		const bucketEnd = index === bucketCount - 1
			? end
			: start + (index + 1) * step - 1;

		buckets.push({
			startTime: bucketStart,
			endTime: bucketEnd,
			label: formatActivityBucketLabel(bucketStart, bucketEnd, since),
			minedAtomic: 0n,
			stakedAtomic: 0n,
			receivedAtomic: 0n,
			spentAtomic: 0n
		});
	}

	return buckets;
}

function formatActivityBucketLabel(startTime, endTime, since) {
	const start = new Date(startTime * 1000);
	const end = new Date(endTime * 1000);
	const span = endTime - startTime;

	if (!since || span <= 2 * 86_400) {
		return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	if (span <= 10 * 86_400) {
		return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	if (span <= 40 * 86_400) {
		return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	return start.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function findActivityBucketIndex(buckets, time) {
	for (let index = 0; index < buckets.length; index += 1) {
		if (time >= buckets[index].startTime && time <= buckets[index].endTime) {
			return index;
		}
	}

	return buckets.length - 1;
}

function mapActivityBucket(chainId, bucket) {
	const mined = formatAtomic(chainId, bucket.minedAtomic);
	const staked = formatAtomic(chainId, bucket.stakedAtomic);
	const received = formatAtomic(chainId, bucket.receivedAtomic);
	const spentMagnitude = formatAtomic(chainId, bucket.spentAtomic);
	const unit = mined.ticker || "VRM";
	const toChartAmount = amount => Number.parseFloat(amount.amount) || 0;

	return {
		startTime: bucket.startTime,
		endTime: bucket.endTime,
		label: bucket.label,
		minedAtomic: stringifyInteger(bucket.minedAtomic),
		stakedAtomic: stringifyInteger(bucket.stakedAtomic),
		receivedAtomic: stringifyInteger(bucket.receivedAtomic),
		spentAtomic: stringifyInteger(bucket.spentAtomic),
		mined,
		staked,
		received,
		spent: spentMagnitude,
		minedAmount: toChartAmount(mined),
		stakedAmount: toChartAmount(staked),
		receivedAmount: toChartAmount(received),
		spentAmount: -toChartAmount(spentMagnitude),
		ticker: unit
	};
}

function getAddressBalanceHistory(chainId, address, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const cleanAddress = normalizeAddress(address);
	const maxPoints = normalizeBalanceHistoryPoints(options.maxPoints);
	const since = normalizeSince(options.since);
	const chainHealth = health.getChainHealth(chain, { db });
	const balanceRow = prepare(db, `
		SELECT balance_sats
		FROM address_balances
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const eventCountRow = prepare(db, `
		SELECT COUNT(*) AS count
		FROM address_events
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const eventCount = toNumber(eventCountRow.count);

	if (eventCount > maxBalanceHistoryEvents) {
		return {
			chainId: chain,
			address: cleanAddress,
			found: !!balanceRow,
			trusted: chainHealth.trusted,
			source: getSource(chainHealth, "address"),
			truncated: true,
			eventCount,
			maxEvents: maxBalanceHistoryEvents,
			since,
			categories: addressActivityCategories,
			buckets: [],
			points: [],
			currentBalanceAtomic: balanceRow ? stringifyInteger(balanceRow.balance_sats) : "0"
		};
	}

	let priorBalance = 0n;
	if (since) {
		const priorRow = prepare(db, `
			SELECT COALESCE(SUM(delta_sats), 0) AS total
			FROM address_events
			WHERE chain_id = ? AND address = ? AND time < ?
		`).get(chain, cleanAddress, since);
		priorBalance = toBigInt(priorRow.total);
	}

	const eventRows = since
		? prepare(db, `
			SELECT
				address_events.block_height,
				address_events.time,
				address_events.delta_sats,
				address_events.event_type,
				transactions.is_coinbase,
				transactions.is_coinstake
			FROM address_events
			INNER JOIN transactions
				ON transactions.chain_id = address_events.chain_id
				AND transactions.txid = address_events.txid
			WHERE address_events.chain_id = ? AND address_events.address = ? AND address_events.time >= ?
			ORDER BY address_events.time ASC, address_events.id ASC
		`).all(chain, cleanAddress, since)
		: prepare(db, `
			SELECT
				address_events.block_height,
				address_events.time,
				address_events.delta_sats,
				address_events.event_type,
				transactions.is_coinbase,
				transactions.is_coinstake
			FROM address_events
			INNER JOIN transactions
				ON transactions.chain_id = address_events.chain_id
				AND transactions.txid = address_events.txid
			WHERE address_events.chain_id = ? AND address_events.address = ?
			ORDER BY address_events.time ASC, address_events.id ASC
		`).all(chain, cleanAddress);

	const firstTime = eventRows.length ? toNumber(eventRows[0].time) : null;
	const lastTime = eventRows.length ? toNumber(eventRows[eventRows.length - 1].time) : null;
	const bucketPlan = buildActivityBucketPlan(since, maxPoints, firstTime, lastTime);

	for (const row of eventRows) {
		const time = toNumber(row.time);
		const bucketIndex = findActivityBucketIndex(bucketPlan, time);
		const bucket = bucketPlan[bucketIndex];
		const delta = toBigInt(row.delta_sats);
		const magnitude = delta < 0n ? -delta : delta;
		const category = getAddressActivityCategory(row);

		if (category === "mined") {
			bucket.minedAtomic += magnitude;
		} else if (category === "staked") {
			bucket.stakedAtomic += magnitude;
		} else if (category === "received") {
			bucket.receivedAtomic += magnitude;
		} else {
			bucket.spentAtomic += magnitude;
		}
	}

	const buckets = bucketPlan.map(bucket => mapActivityBucket(chain, bucket));
	const points = buildCumulativeBalancePoints(chain, eventRows, since, maxPoints, priorBalance);
	let endingBalance = priorBalance;

	for (const row of eventRows) {
		endingBalance += toBigInt(row.delta_sats);
	}

	return {
		chainId: chain,
		address: cleanAddress,
		found: !!balanceRow || eventRows.length > 0 || priorBalance !== 0n,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "address"),
		truncated: false,
		eventCount,
		since,
		categories: addressActivityCategories,
		buckets,
		points,
		currentBalanceAtomic: balanceRow
			? stringifyInteger(balanceRow.balance_sats)
			: stringifyInteger(endingBalance)
	};
}

function mapChainActivityBucket(bucket) {
	return {
		startTime: bucket.startTime,
		endTime: bucket.endTime,
		label: bucket.label,
		minedCount: bucket.minedCount,
		stakedCount: bucket.stakedCount,
		receivedCount: bucket.receivedCount,
		blockCount: bucket.blockCount
	};
}

function getChainActivityHistory(chainId, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const maxPoints = normalizeBalanceHistoryPoints(options.maxPoints);
	const since = normalizeSince(options.since);
	const chainHealth = health.getChainHealth(chain, { db });
	const txBounds = prepare(db, `
		SELECT MIN(time) AS min_time, MAX(time) AS max_time
		FROM transactions
		WHERE chain_id = ? AND time IS NOT NULL
	`).get(chain);
	const blockBounds = prepare(db, `
		SELECT MIN(time) AS min_time, MAX(time) AS max_time
		FROM blocks
		WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
	`).get(chain);
	const minCandidates = [
		toNullableNumber(txBounds.min_time),
		toNullableNumber(blockBounds.min_time)
	].filter(value => value != null);
	const maxCandidates = [
		toNullableNumber(txBounds.max_time),
		toNullableNumber(blockBounds.max_time)
	].filter(value => value != null);
	const resolvedFirst = minCandidates.length ? Math.min(...minCandidates) : null;
	const resolvedLast = maxCandidates.length ? Math.max(...maxCandidates) : null;
	const bucketPlan = buildActivityBucketPlan(since, maxPoints, resolvedFirst, resolvedLast).map(bucket => Object.assign({}, bucket, {
		minedCount: 0,
		stakedCount: 0,
		receivedCount: 0,
		blockCount: 0
	}));

	const rangeStart = bucketPlan[0]?.startTime ?? since ?? resolvedFirst ?? 0;
	const rangeEnd = bucketPlan[bucketPlan.length - 1]?.endTime ?? resolvedLast ?? rangeStart;
	const bucketRows = prepare(db, `
		SELECT bucket_start, mined_count, staked_count, received_count, block_count
		FROM chain_activity_buckets
		WHERE chain_id = ? AND bucket_start >= ? AND bucket_start <= ?
		ORDER BY bucket_start ASC
	`).all(chain, rangeStart, rangeEnd + 3600);

	if (bucketRows.length > 0) {
		for (const row of bucketRows) {
			const bucketIndex = findActivityBucketIndex(bucketPlan, toNumber(row.bucket_start));
			const bucket = bucketPlan[bucketIndex];
			bucket.minedCount += toNumber(row.mined_count);
			bucket.stakedCount += toNumber(row.staked_count);
			bucket.receivedCount += toNumber(row.received_count);
			bucket.blockCount += toNumber(row.block_count);
		}
	} else {
		const txRows = since
			? prepare(db, `
				SELECT time, is_coinbase, is_coinstake
				FROM transactions
				WHERE chain_id = ? AND time IS NOT NULL AND time >= ?
				ORDER BY time ASC
			`).all(chain, since)
			: prepare(db, `
				SELECT time, is_coinbase, is_coinstake
				FROM transactions
				WHERE chain_id = ? AND time IS NOT NULL
				ORDER BY time ASC
			`).all(chain);

		for (const row of txRows) {
			const time = toNumber(row.time);
			const bucketIndex = findActivityBucketIndex(bucketPlan, time);
			const bucket = bucketPlan[bucketIndex];
			const category = getTxActivityCategory(row);

			if (category === "mined") {
				bucket.minedCount += 1;
			} else if (category === "staked") {
				bucket.stakedCount += 1;
			} else {
				bucket.receivedCount += 1;
			}
		}

		const blockRows = since
			? prepare(db, `
				SELECT time
				FROM blocks
				WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL AND time >= ?
				ORDER BY time ASC
			`).all(chain, since)
			: prepare(db, `
				SELECT time
				FROM blocks
				WHERE chain_id = ? AND status = 'main' AND time IS NOT NULL
				ORDER BY time ASC
			`).all(chain);

		for (const row of blockRows) {
			const time = toNumber(row.time);
			const bucketIndex = findActivityBucketIndex(bucketPlan, time);
			bucketPlan[bucketIndex].blockCount += 1;
		}
	}

	return {
		chainId: chain,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "summary"),
		since,
		categories: chainActivityCategories,
		buckets: bucketPlan.map(mapChainActivityBucket)
	};
}

function getAddressUtxos(chainId, address, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const cleanAddress = normalizeAddress(address);
	const limit = normalizeLimit(options.limit);
	const offset = normalizeOffset(options.offset);
	const chainHealth = health.getChainHealth(chain, { db });
	const utxoParams = [chain, cleanAddress, chain, cleanAddress, cleanAddress];
	const rows = prepare(db, ADDRESS_UTXO_ROWS_SQL).all(...utxoParams, limit, offset);
	const summaryRow = prepare(db, ADDRESS_UTXO_SUMMARY_SQL).get(...utxoParams);

	return {
		chainId: chain,
		address: cleanAddress,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "address"),
		summary: {
			utxoCount: toNumber(summaryRow.count),
			totalValueAtomic: stringifyInteger(summaryRow.total_sats),
			totalValue: formatAtomic(chain, summaryRow.total_sats)
		},
		paging: getPaging(limit, offset, summaryRow.count),
		items: rows.map(row => ({
			txid: row.txid,
			vout: toNumber(row.n),
			valueAtomic: stringifyInteger(row.value_sats),
			value: formatAtomic(chain, row.value_sats),
			blockHeight: toNumber(row.block_height),
			time: toNumber(row.time)
		}))
	};
}

function getTransaction(chainId, txid, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const cleanTxid = normalizeHash(txid);
	const chainHealth = health.getChainHealth(chain, { db });
	const tx = prepare(db, `
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake, raw_available, source
		FROM transactions
		WHERE chain_id = ? AND txid = ?
	`).get(chain, cleanTxid);

	if (!tx) {
		return {
			chainId: chain,
			txid: cleanTxid,
			found: false,
			trusted: chainHealth.trusted,
			source: getSource(chainHealth, "transaction")
		};
	}

	const vins = prepare(db, `
		SELECT n, prev_txid, prev_vout, address, value_sats, source, resolved
		FROM vins
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`).all(chain, cleanTxid).map(row => mapVin(chain, row));
	const vouts = prepare(db, `
		SELECT n, address, value_sats, script_type, script_pub_key, spent_by_txid, spent_by_vin, spent_height, is_spent
		FROM vouts
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`).all(chain, cleanTxid).map(row => mapVout(chain, row));
	const addressEvents = prepare(db, `
		SELECT address, delta_sats, event_type
		FROM address_events
		WHERE chain_id = ? AND txid = ?
		ORDER BY id ASC
	`).all(chain, cleanTxid).map(row => ({
		address: row.address,
		deltaAtomic: stringifyInteger(row.delta_sats),
		delta: formatAtomic(chain, row.delta_sats),
		eventType: row.event_type
	}));
	const mappedTx = mapTransaction(tx);
	const totals = computeTransactionTotals(chain, vins, vouts);
	const siblings = getTransactionSiblings(db, chain, mappedTx.blockHeight, mappedTx.txIndex);
	const changeOutputs = detectChangeOutputIndices(vins, vouts, !!toNumber(tx.is_coinbase));
	const confirmations = computeConfirmations(chainHealth, mappedTx.blockHeight);

	return {
		chainId: chain,
		found: true,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "transaction"),
		transaction: mappedTx,
		inputs: vins,
		outputs: vouts,
		addressEvents,
		totals,
		confirmations,
		siblings,
		changeOutputs
	};
}

function getBlock(chainId, hashOrHeight, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const value = String(hashOrHeight || "").trim();
	const chainHealth = health.getChainHealth(chain, { db });
	const block = /^\d+$/.test(value)
		? db.prepare(`
			SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty
			FROM blocks
			WHERE chain_id = ? AND height = ?
		`).get(chain, Number(value))
		: db.prepare(`
			SELECT height, hash, previous_hash, next_hash, time, tx_count, size, difficulty
			FROM blocks
			WHERE chain_id = ? AND hash = ?
		`).get(chain, normalizeHash(value));

	if (!block) {
		return {
			chainId: chain,
			query: value,
			found: false,
			trusted: chainHealth.trusted,
			source: getSource(chainHealth, "block")
		};
	}

	const limit = normalizeLimit(options.limit);
	const offset = normalizeOffset(options.offset);
	const txRows = db.prepare(`
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ? AND block_height = ?
		ORDER BY tx_index ASC
		LIMIT ? OFFSET ?
	`).all(chain, block.height, limit, offset);
	const mappedBlock = enrichBlocks(db, chain, [mapBlock(block)])[0];
	const transactions = attachTransactionSummaries(
		db,
		chain,
		txRows.map(tx => mapTransaction(tx))
	);

	return {
		chainId: chain,
		found: true,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "block"),
		block: mappedBlock,
		paging: getPaging(limit, offset, block.tx_count),
		transactions,
		confirmations: computeConfirmations(chainHealth, mappedBlock.height),
		coinbase: getCoinbaseSummary(db, chain, mappedBlock.height),
		totals: computeBlockTotals(db, chain, mappedBlock.height)
	};
}

function disabledResponse(chainId, chainHealth, feature) {
	return {
		chainId,
		enabled: false,
		trusted: false,
		source: getSource(chainHealth, feature),
		message: `${feature} is unavailable until blocks have been indexed.`,
		health: chainHealth
	};
}

function mapBlock(block) {
	return {
		height: toNumber(block.height),
		hash: block.hash,
		previousHash: block.previous_hash || null,
		nextHash: block.next_hash || null,
		time: toNumber(block.time),
		txCount: toNumber(block.tx_count),
		size: toNullableNumber(block.size),
		difficulty: block.difficulty === null || block.difficulty === undefined ? null : String(block.difficulty),
		outputCount: block.outputCount == null ? null : toNumber(block.outputCount),
		extractedBy: block.extractedBy || null,
		extractedByAddress: block.extractedByAddress || null
	};
}

function enrichLatestBlocks(db, chain, blocks) {
	if (!blocks.length) {
		return blocks;
	}

	if (blocks.every(block => block.outputCount != null)) {
		return blocks;
	}

	return enrichBlocks(db, chain, blocks);
}

function enrichBlocks(db, chain, blocks) {
	if (!blocks.length) {
		return blocks;
	}

	const heights = blocks.map(block => block.height);
	const placeholders = heights.map(() => "?").join(",");
	const outputCounts = db.prepare(`
		SELECT t.block_height AS height, COUNT(*) AS count
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height IN (${placeholders})
		GROUP BY t.block_height
	`).all(chain, ...heights);
	const outputCountByHeight = Object.fromEntries(
		outputCounts.map(row => [row.height, toNumber(row.count)])
	);

	const coinbaseVouts = db.prepare(`
		SELECT t.block_height AS height, t.txid, v.n, v.address, v.value_sats
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height IN (${placeholders}) AND t.is_coinbase = 1
		ORDER BY t.block_height DESC, v.n ASC
	`).all(chain, ...heights);
	const coinbaseVoutsByHeight = {};

	for (const row of coinbaseVouts) {
		if (!coinbaseVoutsByHeight[row.height]) {
			coinbaseVoutsByHeight[row.height] = [];
		}
		coinbaseVoutsByHeight[row.height].push(row);
	}

	return blocks.map(block => {
		const coinbaseRows = coinbaseVoutsByHeight[block.height] || [];
		const miner = coinbaseRows.length > 0 ? identifyMinerFromVouts(coinbaseRows, block) : null;

		return Object.assign({}, block, {
			outputCount: block.outputCount ?? outputCountByHeight[block.height] ?? null,
			extractedBy: block.extractedBy ?? (miner ? miner.name : null),
			extractedByAddress: block.extractedByAddress ?? (miner && miner.type === "address-only" ? miner.name : null)
		});
	});
}

function identifyMinerFromVouts(vouts, block) {
	const coinbaseTx = {
		blockhash: block.hash,
		vin: [{ coinbase: "00" }],
		vout: vouts.map(row => ({
			n: row.n,
			value: Number(row.value_sats) / 100000000,
			scriptPubKey: row.address ? { address: row.address } : {}
		}))
	};

	return utils.identifyMiner(coinbaseTx, block.height);
}

function mapTransaction(tx) {
	return {
		txid: tx.txid,
		blockHeight: toNumber(tx.block_height),
		blockHash: tx.block_hash,
		txIndex: toNumber(tx.tx_index),
		time: toNumber(tx.time),
		isCoinbase: !!toNumber(tx.is_coinbase),
		isCoinstake: !!toNumber(tx.is_coinstake),
		rawAvailable: tx.raw_available === undefined ? undefined : !!toNumber(tx.raw_available),
		source: tx.source || "index"
	};
}

function mapAddressBalance(chainId, row, firstSeenRow) {
	return Object.assign(mapAddressBalanceCore(chainId, row), mapAddressLifecycle(firstSeenRow, row));
}

function mapAddressBalanceCore(chainId, row) {
	return {
		address: row.address,
		balanceAtomic: stringifyInteger(row.balance_sats),
		balance: formatAtomic(chainId, row.balance_sats),
		totalReceivedAtomic: stringifyInteger(row.total_received_sats),
		totalReceived: formatAtomic(chainId, row.total_received_sats),
		totalSentAtomic: stringifyInteger(row.total_sent_sats),
		totalSent: formatAtomic(chainId, row.total_sent_sats),
		txCount: toNumber(row.tx_count),
		lastSeenHeight: toNullableNumber(row.last_seen_height)
	};
}

function mapAddressLifecycle(firstSeenRow, balanceRow) {
	return {
		firstSeenHeight: firstSeenRow ? toNullableNumber(firstSeenRow.first_seen_height) : null,
		firstSeenTime: firstSeenRow ? toNullableNumber(firstSeenRow.first_seen_time) : null,
		lastSeenHeight: balanceRow ? toNullableNumber(balanceRow.last_seen_height) : null
	};
}

function emptyAddressBalance(chainId, address, firstSeenRow) {
	return Object.assign(
		mapAddressBalanceCore(chainId, {
			address,
			balance_sats: 0n,
			total_received_sats: 0n,
			total_sent_sats: 0n,
			tx_count: 0,
			last_seen_height: null
		}),
		mapAddressLifecycle(firstSeenRow, null)
	);
}

function buildCumulativeBalancePoints(chain, eventRows, since, maxPoints, priorBalance) {
	let running = priorBalance;
	const rawPoints = [];

	if (since && (priorBalance !== 0n || eventRows.length > 0)) {
		const balance = formatAtomic(chain, priorBalance);
		rawPoints.push({
			height: eventRows.length ? toNumber(eventRows[0].block_height) : null,
			time: since,
			balanceAtomic: stringifyInteger(priorBalance),
			balance,
			balanceAmount: Number.parseFloat(balance.amount) || 0,
			ticker: balance.ticker
		});
	}

	for (const row of eventRows) {
		running += toBigInt(row.delta_sats);
		const balance = formatAtomic(chain, running);
		rawPoints.push({
			height: toNumber(row.block_height),
			time: toNumber(row.time),
			balanceAtomic: stringifyInteger(running),
			balance,
			balanceAmount: Number.parseFloat(balance.amount) || 0,
			ticker: balance.ticker
		});
	}

	return downsampleBalanceHistoryPoints(rawPoints, maxPoints);
}

function downsampleBalanceHistoryPoints(points, maxPoints) {
	if (!points.length || points.length <= maxPoints) {
		return points;
	}

	const sampled = [];
	const lastIndex = points.length - 1;

	for (let i = 0; i < maxPoints; i += 1) {
		const index = i === maxPoints - 1
			? lastIndex
			: Math.floor((i * lastIndex) / (maxPoints - 1));
		sampled.push(points[index]);
	}

	return sampled;
}

function normalizeBalanceHistoryPoints(value) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return defaultBalanceHistoryPoints;
	}

	return Math.min(Math.max(Math.floor(parsed), 2), maxBalanceHistoryPoints);
}

function normalizeSince(value) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return Math.floor(parsed);
}

function mapAddressTransaction(chainId, row) {
	return {
		txid: row.txid,
		blockHeight: toNumber(row.first_seen_height),
		blockHash: row.block_hash,
		txIndex: toNumber(row.tx_index),
		time: toNumber(row.first_seen_time),
		netDeltaAtomic: stringifyInteger(row.net_delta_sats || 0n),
		netDelta: formatAtomic(chainId, row.net_delta_sats || 0n),
		isCoinbase: !!toNumber(row.is_coinbase),
		isCoinstake: !!toNumber(row.is_coinstake)
	};
}

function mapVin(chainId, row) {
	return {
		n: toNumber(row.n),
		prevTxid: row.prev_txid || null,
		prevVout: toNullableNumber(row.prev_vout),
		address: row.address || null,
		valueAtomic: row.value_sats === null ? null : stringifyInteger(row.value_sats),
		value: row.value_sats === null ? null : formatAtomic(chainId, row.value_sats),
		source: row.source,
		resolved: !!toNumber(row.resolved)
	};
}

function mapVout(chainId, row) {
	return {
		n: toNumber(row.n),
		address: row.address || null,
		valueAtomic: stringifyInteger(row.value_sats),
		value: formatAtomic(chainId, row.value_sats),
		scriptType: row.script_type || null,
		scriptPubKey: row.script_pub_key || null,
		spentByTxid: row.spent_by_txid || null,
		spentByVin: toNullableNumber(row.spent_by_vin),
		spentHeight: toNullableNumber(row.spent_height),
		isSpent: !!toNumber(row.is_spent)
	};
}

function getSource(chainHealth, feature) {
	const sourceLabel = chainHealth.sourceLabels && (
		chainHealth.sourceLabels[feature]
		|| (feature === "address" ? chainHealth.sourceLabels.addressBalances : null)
		|| (feature === "summary" ? chainHealth.sourceLabels.blocks : null)
	);

	return {
		label: sourceLabel || "index",
		trustLevel: chainHealth.trustLevel,
		healthStatus: chainHealth.status,
		message: chainHealth.message
	};
}

function getPaging(limit, offset, total) {
	const count = toNumber(total || 0);

	return {
		limit,
		offset,
		total: count,
		hasMore: offset + limit < count
	};
}

function formatAtomic(chainId, value) {
	const unit = getChainUnit(chainId);

	return {
		amount: atomicUnitsToDecimal(value, unit.decimalPlaces),
		ticker: unit.ticker,
		decimalPlaces: unit.decimalPlaces
	};
}

function getChainUnit(chainId) {
	return chainUnits[chainId] || {
		ticker: chainId.toUpperCase(),
		decimalPlaces: 8
	};
}

function normalizeChainId(chainId) {
	const value = String(chainId || "").trim().toLowerCase();

	if (!value || !chainUnits[value]) {
		throw new Error(`Unknown chain: ${chainId}`);
	}

	return value;
}

function normalizeAddress(address) {
	const value = String(address || "").trim();

	if (!value) {
		throw new Error("Address is required.");
	}

	return value;
}

function normalizeHash(hash) {
	const value = String(hash || "").trim();

	if (!/^[a-fA-F0-9]{64}$/.test(value)) {
		throw new Error("Expected a 64-character hex hash.");
	}

	return value.toLowerCase();
}

function normalizeLimit(value) {
	const limit = Number(value || defaultLimit);

	if (!Number.isFinite(limit) || limit < 1) {
		return defaultLimit;
	}

	return Math.min(Math.floor(limit), maxLimit);
}

function normalizePeriod(value) {
	const period = String(value || "week").trim().toLowerCase();

	if (["week", "month"].includes(period)) {
		return period;
	}

	return "week";
}

function normalizeLeaderboardSort(value) {
	const sort = String(value || "net").trim().toLowerCase();

	if (["received", "sent", "net", "activity"].includes(sort)) {
		return sort;
	}

	return "net";
}

function getPeriodBounds(period, nowValue) {
	const now = nowValue ? new Date(nowValue) : new Date();
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
		type: period,
		start: Math.floor(start.getTime() / 1000),
		end: Math.floor(end.getTime() / 1000),
		startIso: start.toISOString(),
		endIso: end.toISOString()
	};
}

function normalizeOffset(value) {
	const offset = Number(value || 0);

	if (!Number.isFinite(offset) || offset < 0) {
		return 0;
	}

	return Math.floor(offset);
}

function stringifyInteger(value) {
	return String(value === null || value === undefined ? 0 : value);
}

function toBigInt(value) {
	if (value === null || value === undefined) {
		return 0n;
	}

	return typeof value === "bigint" ? value : BigInt(value);
}

function computeTransactionTotals(chainId, vins, vouts) {
	let inputAtomic = 0n;
	let outputAtomic = 0n;

	for (const vin of vins) {
		if (vin.resolved && vin.valueAtomic !== null && vin.valueAtomic !== undefined) {
			inputAtomic += toBigInt(vin.valueAtomic);
		}
	}

	for (const vout of vouts) {
		outputAtomic += toBigInt(vout.valueAtomic);
	}

	const feeAtomic = inputAtomic >= outputAtomic ? inputAtomic - outputAtomic : 0n;

	return {
		inputAtomic: stringifyInteger(inputAtomic),
		outputAtomic: stringifyInteger(outputAtomic),
		feeAtomic: stringifyInteger(feeAtomic),
		input: formatAtomic(chainId, inputAtomic),
		output: formatAtomic(chainId, outputAtomic),
		fee: formatAtomic(chainId, feeAtomic)
	};
}

function computeConfirmations(chainHealth, blockHeight) {
	const tip = chainHealth.heights.bestRpcHeight
		?? chainHealth.heights.lastIndexedHeight
		?? chainHealth.heights.maxIndexedHeight;

	if (tip === null || tip === undefined || blockHeight === null || blockHeight === undefined) {
		return null;
	}

	return Math.max(1, toNumber(tip) - toNumber(blockHeight) + 1);
}

function getTransactionSiblings(db, chainId, blockHeight, txIndex) {
	const lookup = (index) => {
		if (index < 0) {
			return null;
		}

		const row = db.prepare(`
			SELECT txid
			FROM transactions
			WHERE chain_id = ? AND block_height = ? AND tx_index = ?
		`).get(chainId, blockHeight, index);

		return row ? row.txid : null;
	};

	return {
		prevTxid: lookup(toNumber(txIndex) - 1),
		nextTxid: lookup(toNumber(txIndex) + 1)
	};
}

function detectChangeOutputIndices(vins, vouts, isCoinbase) {
	if (isCoinbase) {
		return [];
	}

	const inputAddresses = new Set(
		vins.map(vin => vin.address).filter(Boolean)
	);

	return vouts
		.filter(vout => vout.address && inputAddresses.has(vout.address))
		.map(vout => vout.n);
}

function getCoinbaseSummary(db, chainId, blockHeight) {
	const coinbaseTx = db.prepare(`
		SELECT txid
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND is_coinbase = 1
		ORDER BY tx_index ASC
		LIMIT 1
	`).get(chainId, blockHeight);

	if (!coinbaseTx) {
		return null;
	}

	const vouts = db.prepare(`
		SELECT value_sats
		FROM vouts
		WHERE chain_id = ? AND txid = ?
	`).all(chainId, coinbaseTx.txid);

	let rewardAtomic = 0n;
	for (const row of vouts) {
		rewardAtomic += toBigInt(row.value_sats);
	}

	return {
		txid: coinbaseTx.txid,
		rewardAtomic: stringifyInteger(rewardAtomic),
		reward: formatAtomic(chainId, rewardAtomic)
	};
}

function computeBlockTotals(db, chainId, blockHeight) {
	const outputRow = db.prepare(`
		SELECT COALESCE(SUM(v.value_sats), 0) AS total
		FROM vouts v
		INNER JOIN transactions t ON t.chain_id = v.chain_id AND t.txid = v.txid
		WHERE v.chain_id = ? AND t.block_height = ?
	`).get(chainId, blockHeight);

	const outputValueAtomic = toBigInt(outputRow.total);
	const nonCoinbaseTxs = db.prepare(`
		SELECT txid
		FROM transactions
		WHERE chain_id = ? AND block_height = ? AND is_coinbase = 0
	`).all(chainId, blockHeight);

	let feeAtomic = 0n;
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
		const inputByTxid = Object.fromEntries(inputStats.map(row => [row.txid, row.total]));
		const outputByTxid = Object.fromEntries(outputStats.map(row => [row.txid, row.total]));

		for (const tx of nonCoinbaseTxs) {
			const inputAtomic = toBigInt(inputByTxid[tx.txid] || 0);
			const txOutputAtomic = toBigInt(outputByTxid[tx.txid] || 0);
			if (inputAtomic >= txOutputAtomic) {
				feeAtomic += inputAtomic - txOutputAtomic;
			}
		}
	}

	return {
		feeAtomic: stringifyInteger(feeAtomic),
		fee: formatAtomic(chainId, feeAtomic),
		outputValueAtomic: stringifyInteger(outputValueAtomic),
		outputValue: formatAtomic(chainId, outputValueAtomic)
	};
}

function attachTransactionSummaries(db, chainId, transactions) {
	if (!transactions.length) {
		return transactions;
	}

	const txids = transactions.map(tx => tx.txid);
	const placeholders = txids.map(() => "?").join(",");
	const outputStats = db.prepare(`
		SELECT txid, COUNT(*) AS output_count, COALESCE(SUM(value_sats), 0) AS output_sats
		FROM vouts
		WHERE chain_id = ? AND txid IN (${placeholders})
		GROUP BY txid
	`).all(chainId, ...txids);
	const statsByTxid = Object.fromEntries(outputStats.map(row => [row.txid, row]));

	const nonCoinbaseTxids = transactions.filter(tx => !tx.isCoinbase).map(tx => tx.txid);
	const inputStatsByTxid = {};
	if (nonCoinbaseTxids.length > 0) {
		const inputPlaceholders = nonCoinbaseTxids.map(() => "?").join(",");
		const inputStats = db.prepare(`
			SELECT txid, COALESCE(SUM(value_sats), 0) AS total
			FROM vins
			WHERE chain_id = ? AND txid IN (${inputPlaceholders}) AND resolved = 1
			GROUP BY txid
		`).all(chainId, ...nonCoinbaseTxids);
		for (const row of inputStats) {
			inputStatsByTxid[row.txid] = row.total;
		}
	}

	return transactions.map(tx => {
		const stats = statsByTxid[tx.txid];
		const summary = {
			outputCount: stats ? toNumber(stats.output_count) : 0,
			totalOutputAtomic: stats ? stringifyInteger(stats.output_sats) : "0",
			totalOutput: formatAtomic(chainId, stats ? stats.output_sats : 0)
		};

		if (!tx.isCoinbase) {
			const inputAtomic = toBigInt(inputStatsByTxid[tx.txid] || 0);
			const outputAtomic = toBigInt(stats ? stats.output_sats : 0);
			if (inputAtomic >= outputAtomic) {
				summary.feeAtomic = stringifyInteger(inputAtomic - outputAtomic);
				summary.fee = formatAtomic(chainId, inputAtomic - outputAtomic);
			}
		}

		return Object.assign({}, tx, { summary });
	});
}

function toNullableNumber(value) {
	if (value === null || value === undefined) {
		return null;
	}

	return toNumber(value);
}

function toNumber(value) {
	return typeof value === "bigint" ? Number(value) : Number(value);
}

module.exports = {
	getChainSummary,
	getRichlist,
	getLeaderboard,
	getAddress,
	getAddressBalanceHistory,
	getChainActivityHistory,
	getAddressUtxos,
	getTransaction,
	getBlock
};
