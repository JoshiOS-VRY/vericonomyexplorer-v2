"use strict";

const dbModule = require("./db.js");
const health = require("./health.js");
const { atomicUnitsToDecimal } = require("./valueUtils.js");

const defaultLimit = 25;
const maxLimit = 100;

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
	const blockLimit = normalizeSummaryLimit(options.blockLimit, 10);
	const txLimit = normalizeSummaryLimit(options.txLimit, 25);
	const useLiteHealth = options.liteHealth !== false;
	const chainHealth = useLiteHealth
		? health.getChainHealthLite(chain, { db })
		: health.getChainHealth(chain, { db });
	const latestBlocks = db.prepare(`
		SELECT height, hash, previous_hash, time, tx_count, size, difficulty
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
		ORDER BY height DESC
		LIMIT ?
	`).all(chain, blockLimit).map(block => mapBlock(block));
	const recentTransactions = db.prepare(`
		SELECT txid, block_height, block_hash, tx_index, time, is_coinbase, is_coinstake
		FROM transactions
		WHERE chain_id = ?
		ORDER BY block_height DESC, tx_index DESC
		LIMIT ?
	`).all(chain, txLimit).map(tx => mapTransaction(tx));

	return {
		chainId: chain,
		health: chainHealth,
		latestBlocks,
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

	if (!chainHealth.trusted && options.allowUntrusted !== true) {
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
		}, mapAddressBalance(chain, row)))
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

	if (!chainHealth.trusted && options.allowUntrusted !== true) {
		return disabledResponse(chain, chainHealth, "leaderboards");
	}

	const periodBounds = getPeriodBounds(period, options.now);
	const orderColumn = {
		received: "received_sats",
		sent: "sent_sats",
		net: "net_sats",
		activity: "tx_count"
	}[sort];
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
	const chainHealth = options.liteHealth === false
		? health.getChainHealth(chain, { db })
		: health.getChainHealthLite(chain, { db });
	const balanceRow = db.prepare(`
		SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count, last_seen_height
		FROM address_balances
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);
	const txRows = db.prepare(`
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
	const countRow = db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_transactions
		WHERE chain_id = ? AND address = ?
	`).get(chain, cleanAddress);

	return {
		chainId: chain,
		address: cleanAddress,
		found: !!balanceRow,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "address"),
		balance: balanceRow ? mapAddressBalance(chain, balanceRow) : emptyAddressBalance(chain, cleanAddress),
		paging: getPaging(limit, offset, countRow.count),
		transactions: txRows.map(row => mapAddressTransaction(chain, row))
	};
}

function getTransaction(chainId, txid, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const chain = normalizeChainId(chainId);
	const cleanTxid = normalizeHash(txid);
	const chainHealth = health.getChainHealth(chain, { db });
	const tx = db.prepare(`
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

	const vins = db.prepare(`
		SELECT n, prev_txid, prev_vout, address, value_sats, source, resolved
		FROM vins
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`).all(chain, cleanTxid).map(row => mapVin(chain, row));
	const vouts = db.prepare(`
		SELECT n, address, value_sats, script_type, script_pub_key, spent_by_txid, spent_by_vin, spent_height, is_spent
		FROM vouts
		WHERE chain_id = ? AND txid = ?
		ORDER BY n ASC
	`).all(chain, cleanTxid).map(row => mapVout(chain, row));
	const addressEvents = db.prepare(`
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

	return {
		chainId: chain,
		found: true,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "transaction"),
		transaction: mapTransaction(tx),
		inputs: vins,
		outputs: vouts,
		addressEvents
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

	return {
		chainId: chain,
		found: true,
		trusted: chainHealth.trusted,
		source: getSource(chainHealth, "block"),
		block: mapBlock(block),
		paging: getPaging(limit, offset, block.tx_count),
		transactions: txRows.map(tx => mapTransaction(tx))
	};
}

function disabledResponse(chainId, chainHealth, feature) {
	return {
		chainId,
		enabled: false,
		trusted: false,
		source: getSource(chainHealth, feature),
		message: `${feature} is disabled until this chain is indexed from genesis, internally consistent, and near tip.`,
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
		difficulty: block.difficulty === null || block.difficulty === undefined ? null : String(block.difficulty)
	};
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

function mapAddressBalance(chainId, row) {
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

function emptyAddressBalance(chainId, address) {
	return mapAddressBalance(chainId, {
		address,
		balance_sats: 0n,
		total_received_sats: 0n,
		total_sent_sats: 0n,
		tx_count: 0,
		last_seen_height: null
	});
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

function normalizeSummaryLimit(value, defaultValue) {
	const limit = Number(value || defaultValue);

	if (!Number.isFinite(limit) || limit < 1) {
		return defaultValue;
	}

	return Math.min(Math.floor(limit), 50);
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
	getTransaction,
	getBlock
};
