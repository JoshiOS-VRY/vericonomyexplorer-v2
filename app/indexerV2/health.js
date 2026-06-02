"use strict";

const dbModule = require("./db.js");

const defaultOptions = {
	tipThreshold: 10
};

const chainHealthCache = new Map();

function getHealthCacheTtlMs() {
	const configured = Number(process.env.VCEXP_CHAIN_HEALTH_CACHE_MS ?? 60_000);
	return Number.isFinite(configured) && configured > 0 ? configured : 60_000;
}

function cloneChainHealth(value) {
	return JSON.parse(JSON.stringify(value));
}

function getIndexerHealth(options = {}) {
	const db = options.db || dbModule.openDatabaseReadOnly();
	const chains = db.prepare(`
		SELECT
			chains.id,
			chains.ticker,
			chains.name,
			chains.consensus,
			sync_state.best_rpc_height,
			sync_state.last_indexed_height,
			sync_state.last_indexed_hash,
			sync_state.status,
			sync_state.status_message,
			sync_state.updated_at
		FROM chains
		LEFT JOIN sync_state ON sync_state.chain_id = chains.id
		ORDER BY chains.id
	`).all();

	return {
		path: dbModule.getDatabasePath(),
		generatedAt: Date.now(),
		tipThreshold: getTipThreshold(options),
		chains: chains.map(chain => getChainHealth(chain.id, {
			db,
			chain,
			tipThreshold: getTipThreshold(options),
			fullHealth: true
		}))
	};
}

function getChainHealth(chainId, options = {}) {
	const lite = options.fullHealth !== true;
	const cacheKey = `${chainId}:${lite ? "lite" : "full"}`;
	const bypassCache = options.bypassHealthCache === true;
	const ttlMs = getHealthCacheTtlMs();

	if (!bypassCache) {
		const cached = chainHealthCache.get(cacheKey);
		if (cached && Date.now() - cached.at < ttlMs) {
			return cloneChainHealth(cached.value);
		}
	}

	const value = lite
		? computeChainHealthLite(chainId, options)
		: computeChainHealth(chainId, options);

	if (!bypassCache) {
		chainHealthCache.set(cacheKey, { at: Date.now(), value });
	}

	return cloneChainHealth(value);
}

function computeChainHealthLite(chainId, options = {}) {
	const db = options.db || dbModule.openDatabaseReadOnly();
	const tipThreshold = getTipThreshold(options);
	const chain = options.chain || getChainRow(db, chainId);
	const syncStatus = chain ? chain.status : null;
	const indexed = syncStatus === "indexed";

	const bestRpcHeight = toNullableNumber(chain ? chain.best_rpc_height : null);
	const lastIndexedHeight = toNullableNumber(chain ? chain.last_indexed_height : null);
	const minIndexedHeight = lastIndexedHeight !== null ? 0 : null;
	const maxIndexedHeight = lastIndexedHeight;
	const indexedBlockCount = lastIndexedHeight !== null ? lastIndexedHeight + 1 : 0;
	const expectedBlockCount = indexedBlockCount;
	const blocksBehind = bestRpcHeight === null || lastIndexedHeight === null
		? null
		: Math.max(0, bestRpcHeight - lastIndexedHeight);
	const addressCount = options.skipAddressCount === true
		? null
		: toNumber(db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_balances
		WHERE chain_id = ?
	`).get(chainId).count);

	const checks = {
		hasBlocks: indexedBlockCount > 0,
		startsAtGenesis: indexed && minIndexedHeight === 0,
		noHeightGaps: indexed,
		noUnresolvedSpends: indexed,
		hasRpcTip: bestRpcHeight !== null,
		nearTip: blocksBehind !== null && blocksBehind <= tipThreshold,
		consistentTip: indexed && (blocksBehind === null || blocksBehind === 0)
	};

	const classification = indexed
		? (blocksBehind === null || blocksBehind <= tipThreshold
			? {
				status: "trusted",
				trustLevel: "full",
				message: "Up to date.",
				reasons: []
			}
			: {
				status: "syncing",
				trustLevel: "historical",
				message: "Historical data is available; recent blocks are still loading.",
				reasons: ["Indexer is behind the RPC tip."]
			})
		: classify(checks, {
			indexedBlockCount,
			bestRpcHeight,
			blocksBehind
		});

	return {
		id: chainId,
		ticker: chain ? chain.ticker : chainId.toUpperCase(),
		name: chain ? chain.name : chainId,
		consensus: chain ? chain.consensus : null,
		status: classification.status,
		trusted: classification.status === "trusted",
		trustLevel: classification.trustLevel,
		message: classification.message,
		reasons: classification.reasons,
		checks,
		heights: {
			bestRpcHeight,
			minIndexedHeight,
			maxIndexedHeight,
			lastIndexedHeight,
			blocksBehind,
			tipThreshold
		},
		counts: {
			indexedBlockCount,
			expectedBlockCount,
			gapCount: 0,
			unresolvedSpendCount: 0,
			addressCount
		},
		syncState: {
			status: chain ? chain.status : null,
			statusMessage: chain ? chain.status_message : null,
			updatedAt: toNullableNumber(chain ? chain.updated_at : null),
			lastIndexedHash: chain ? chain.last_indexed_hash : null
		},
		sourceLabels: {
			blocks: "rpc+index",
			transactions: chainId === "vrm" ? "index-required" : "rpc-or-index",
			addressBalances: "index",
			richlist: "index",
			leaderboards: "index"
		}
	};
}

function computeChainHealth(chainId, options = {}) {
	const db = options.db || dbModule.openDatabaseReadOnly();
	const tipThreshold = getTipThreshold(options);
	const chain = options.chain || getChainRow(db, chainId);
	const blockStats = getBlockStats(db, chainId);
	const unresolvedSpendCount = toNumber(db.prepare(`
		SELECT COUNT(*) AS count
		FROM vins
		WHERE chain_id = ? AND resolved = 0 AND source != 'coinbase'
	`).get(chainId).count);
	const addressCount = toNumber(db.prepare(`
		SELECT COUNT(*) AS count
		FROM address_balances
		WHERE chain_id = ?
	`).get(chainId).count);

	const bestRpcHeight = toNullableNumber(chain ? chain.best_rpc_height : null);
	const lastIndexedHeight = toNullableNumber(chain ? chain.last_indexed_height : null);
	const minIndexedHeight = blockStats.minHeight;
	const maxIndexedHeight = blockStats.maxHeight;
	const indexedBlockCount = blockStats.blockCount;
	const expectedBlockCount = minIndexedHeight === null || maxIndexedHeight === null
		? 0
		: maxIndexedHeight - minIndexedHeight + 1;
	const gapCount = Math.max(0, expectedBlockCount - indexedBlockCount);
	const blocksBehind = bestRpcHeight === null || lastIndexedHeight === null
		? null
		: Math.max(0, bestRpcHeight - lastIndexedHeight);

	const checks = {
		hasBlocks: indexedBlockCount > 0,
		startsAtGenesis: minIndexedHeight === 0,
		noHeightGaps: indexedBlockCount > 0 && gapCount === 0,
		noUnresolvedSpends: unresolvedSpendCount === 0,
		hasRpcTip: bestRpcHeight !== null,
		nearTip: blocksBehind !== null && blocksBehind <= tipThreshold,
		consistentTip: lastIndexedHeight === maxIndexedHeight
	};

	const classification = classify(checks, {
		indexedBlockCount,
		bestRpcHeight,
		blocksBehind
	});

	return {
		id: chainId,
		ticker: chain ? chain.ticker : chainId.toUpperCase(),
		name: chain ? chain.name : chainId,
		consensus: chain ? chain.consensus : null,
		status: classification.status,
		trusted: classification.status === "trusted",
		trustLevel: classification.trustLevel,
		message: classification.message,
		reasons: classification.reasons,
		checks,
		heights: {
			bestRpcHeight,
			minIndexedHeight,
			maxIndexedHeight,
			lastIndexedHeight,
			blocksBehind,
			tipThreshold
		},
		counts: {
			indexedBlockCount,
			expectedBlockCount,
			gapCount,
			unresolvedSpendCount,
			addressCount
		},
		syncState: {
			status: chain ? chain.status : null,
			statusMessage: chain ? chain.status_message : null,
			updatedAt: toNullableNumber(chain ? chain.updated_at : null),
			lastIndexedHash: chain ? chain.last_indexed_hash : null
		},
		sourceLabels: {
			blocks: "rpc+index",
			transactions: chainId === "vrm" ? "index-required" : "rpc-or-index",
			addressBalances: "index",
			richlist: "index",
			leaderboards: "index"
		}
	};
}

function getChainRow(db, chainId) {
	return db.prepare(`
		SELECT
			chains.id,
			chains.ticker,
			chains.name,
			chains.consensus,
			sync_state.best_rpc_height,
			sync_state.last_indexed_height,
			sync_state.last_indexed_hash,
			sync_state.status,
			sync_state.status_message,
			sync_state.updated_at
		FROM chains
		LEFT JOIN sync_state ON sync_state.chain_id = chains.id
		WHERE chains.id = ?
	`).get(chainId);
}

function getBlockStats(db, chainId) {
	const bounds = db.prepare(`
		SELECT MIN(height) AS min_height, MAX(height) AS max_height
		FROM blocks
		WHERE chain_id = ? AND status = 'main'
	`).get(chainId);

	const minHeight = toNullableNumber(bounds.min_height);
	const maxHeight = toNullableNumber(bounds.max_height);

	if (minHeight === null || maxHeight === null) {
		return {
			blockCount: 0,
			minHeight: null,
			maxHeight: null
		};
	}

	let blockCount;
	if (minHeight === 0) {
		blockCount = maxHeight + 1;
	} else {
		blockCount = toNumber(db.prepare(`
			SELECT COUNT(*) AS block_count
			FROM blocks
			WHERE chain_id = ? AND status = 'main'
		`).get(chainId).block_count);
	}

	return {
		blockCount,
		minHeight,
		maxHeight
	};
}

function classify(checks, context) {
	const reasons = [];

	if (!checks.hasBlocks) {
		return {
			status: "empty",
			trustLevel: "none",
			message: "No blocks available yet.",
			reasons: ["No blocks have been indexed for this chain."]
		};
	}

	if (!checks.startsAtGenesis) {
		reasons.push("Index does not start at genesis, so balances cannot be trusted.");
	}

	if (!checks.noHeightGaps) {
		reasons.push("Indexed block heights have gaps.");
	}

	if (!checks.noUnresolvedSpends) {
		reasons.push("Some transaction inputs are unresolved.");
	}

	if (!checks.hasRpcTip) {
		reasons.push("Current RPC tip is unknown.");
	}

	if (!checks.nearTip) {
		reasons.push("Indexer is behind the RPC tip.");
	}

	if (!checks.consistentTip) {
		reasons.push("Sync state does not match the highest indexed block.");
	}

	if (reasons.length === 0) {
		return {
			status: "trusted",
			trustLevel: "full",
			message: "Complete chain history is available.",
			reasons
		};
	}

	if (checks.startsAtGenesis && checks.noHeightGaps && checks.noUnresolvedSpends && checks.hasRpcTip && context.blocksBehind !== null && context.blocksBehind > 0) {
		return {
			status: "syncing",
			trustLevel: "historical",
			message: "Historical balances look consistent, but recent blocks are still loading.",
			reasons
		};
	}

	if (checks.startsAtGenesis && checks.noHeightGaps && checks.noUnresolvedSpends) {
		return {
			status: "partial",
			trustLevel: "historical",
			message: "Historical data looks consistent, but the latest blocks are not fully loaded.",
			reasons
		};
	}

	return {
		status: "untrusted",
		trustLevel: "none",
		message: "Address balances, richlist, and leaderboards should not be treated as authoritative yet.",
		reasons
	};
}

function getTipThreshold(options) {
	const value = Number(options.tipThreshold || process.env.VCEXP_INDEXER_TIP_THRESHOLD || defaultOptions.tipThreshold);
	return Number.isFinite(value) ? value : defaultOptions.tipThreshold;
}

function toNullableNumber(value) {
	if (value === null || value === undefined) {
		return null;
	}

	return toNumber(value);
}

function toNumber(value) {
	if (typeof value === "bigint") {
		return Number(value);
	}

	return Number(value);
}

function enrichWithLiveRpc(chainHealth, liveRpcHeight, options = {}) {
	if (liveRpcHeight === null || liveRpcHeight === undefined) {
		return chainHealth;
	}

	const tipThreshold = getTipThreshold(options);
	const lastIndexedHeight = chainHealth.heights.lastIndexedHeight;
	const blocksBehind = lastIndexedHeight === null
		? null
		: Math.max(0, liveRpcHeight - lastIndexedHeight);
	const nearTip = blocksBehind !== null && blocksBehind <= tipThreshold;
	const checks = Object.assign({}, chainHealth.checks, {
		hasRpcTip: true,
		nearTip
	});
	const classification = classify(checks, {
		indexedBlockCount: chainHealth.counts.indexedBlockCount,
		bestRpcHeight: liveRpcHeight,
		blocksBehind
	});
	const explorerStatus = getExplorerStatus(blocksBehind);

	return Object.assign({}, chainHealth, {
		status: classification.status,
		trusted: classification.status === "trusted",
		trustLevel: classification.trustLevel,
		message: classification.message,
		reasons: classification.reasons,
		checks,
		heights: Object.assign({}, chainHealth.heights, {
			bestRpcHeight: liveRpcHeight,
			blocksBehind,
			tipThreshold
		}),
		explorerStatus
	});
}

function getExplorerStatus(blocksBehind) {
	if (blocksBehind === null) {
		return {
			label: "Unknown",
			message: "Latest block height unavailable.",
			syncing: false
		};
	}

	if (blocksBehind > 0) {
		return {
			label: "Updating",
			message: `${blocksBehind.toLocaleString()} block${blocksBehind === 1 ? "" : "s"} behind the latest block.`,
			syncing: true,
			blocksBehind
		};
	}

	return {
		label: "Live",
		message: "Up to date.",
		syncing: false,
		blocksBehind: 0
	};
}

module.exports = {
	getIndexerHealth,
	getChainHealth,
	enrichWithLiveRpc,
	getExplorerStatus
};
