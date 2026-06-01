"use strict";

const debug = require("debug");

const dbModule = require("./db.js");
const { getChainConfig, getRpcCredentials } = require("./chainConfig.js");
const { createRpcClient } = require("./rpcClient.js");
const worker = require("./worker.js");

const debugLog = debug("btcexp:indexer-tip-sync");

const syncInflight = new Map();

function isTipSyncEnabled() {
	const value = String(process.env.VCEXP_TIP_SYNC_ENABLED || "true").trim().toLowerCase();
	return !["0", "false", "no", "off"].includes(value);
}

function getDefaultMaxBlocks(pageType) {
	if (pageType === "address") {
		return Number(process.env.VCEXP_TIP_SYNC_ADDRESS_MAX_BLOCKS || 128);
	}

	if (pageType === "landing") {
		return Number(process.env.VCEXP_TIP_SYNC_LANDING_MAX_BLOCKS || 12);
	}

	return Number(process.env.VCEXP_TIP_SYNC_MAX_BLOCKS || 48);
}

function getDefaultMaxDurationMs(pageType) {
	if (pageType === "address") {
		return Number(process.env.VCEXP_TIP_SYNC_ADDRESS_MAX_MS || 20000);
	}

	return Number(process.env.VCEXP_TIP_SYNC_MAX_MS || 12000);
}

async function syncToTip(chainId, options = {}) {
	if (!isTipSyncEnabled()) {
		return {
			chainId,
			skipped: true,
			reason: "disabled"
		};
	}

	const normalizedChainId = worker.normalizeChainId(chainId);
	const inflightKey = `${normalizedChainId}:${options.pageType || "default"}`;

	if (syncInflight.has(inflightKey)) {
		return syncInflight.get(inflightKey);
	}

	const promise = runSyncToTip(normalizedChainId, options).finally(() => {
		syncInflight.delete(inflightKey);
	});

	syncInflight.set(inflightKey, promise);
	return promise;
}

async function runSyncToTip(chainId, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const pageType = options.pageType || "default";
	const maxBlocks = Number.isFinite(options.maxBlocks)
		? options.maxBlocks
		: getDefaultMaxBlocks(pageType);
	const maxDurationMs = Number.isFinite(options.maxDurationMs)
		? options.maxDurationMs
		: getDefaultMaxDurationMs(pageType);
	const startedAt = Date.now();

	let chainConfig;
	let rpc;

	try {
		chainConfig = getChainConfig(chainId, options.configPath);
		rpc = options.rpc || createRpcClient(getRpcCredentials(chainConfig));
	} catch (err) {
		debugLog(`Tip sync unavailable for ${chainId}: ${err.message}`);
		return {
			chainId,
			skipped: true,
			reason: "rpc-unavailable",
			error: err.message
		};
	}

	let bestHeight;
	try {
		bestHeight = await rpc.call("getblockcount");
	} catch (err) {
		debugLog(`Tip sync RPC failed for ${chainId}: ${err.message}`);
		return {
			chainId,
			skipped: true,
			reason: "rpc-error",
			error: err.message
		};
	}

	refreshRpcTip(db, chainId, bestHeight);

	const startHeight = worker.getResumeHeight(db, chainId);
	if (startHeight > bestHeight) {
		return {
			chainId,
			skipped: true,
			reason: "ahead-of-tip",
			bestHeight,
			startHeight
		};
	}

	const blocksToSync = bestHeight - startHeight + 1;
	if (blocksToSync <= 0) {
		return {
			chainId,
			skipped: true,
			reason: "already-at-tip",
			bestHeight,
			startHeight
		};
	}

	const indexerConfig = chainConfig.indexer || {};
	const chunkSize = Number(process.env.VCEXP_TIP_SYNC_CHUNK_SIZE || 8);
	const storeRawJson = options.storeRawJson === undefined
		? indexerConfig.storeRawJson !== false
		: options.storeRawJson;
	let height = startHeight;
	let indexed = 0;
	let lastEndHeight = startHeight - 1;
	const syncUntilTip = pageType === "address";
	const blockBudget = syncUntilTip ? Number.MAX_SAFE_INTEGER : maxBlocks;

	while (height <= bestHeight
		&& indexed < blockBudget
		&& (Date.now() - startedAt) < maxDurationMs) {
		const blocksLeft = blockBudget - indexed;
		const chunkEnd = Math.min(
			bestHeight,
			height + Math.min(chunkSize, blocksLeft) - 1
		);
		try {
			const chunk = await worker.syncRange({
				chain: chainId,
				db,
				rpc,
				configPath: options.configPath,
				startHeight: height,
				endHeight: chunkEnd,
				storeRawJson,
				autoRollback: options.autoRollback !== false,
				onProgress: options.onProgress
			});

			indexed += chunkEnd - height + 1;
			lastEndHeight = chunkEnd;
			height = chunkEnd + 1;

			if (chunk.indexed === 0 && chunkEnd < bestHeight) {
				height = worker.getResumeHeight(db, chainId);
			}
		} catch (err) {
			debugLog(`Tip sync chunk failed for ${chainId} at ${height}: ${err.message}`);
			return {
				chainId,
				skipped: true,
				reason: "sync-error",
				error: err.message,
				bestHeight,
				startHeight,
				endHeight: lastEndHeight,
				remainingBehind: Math.max(0, bestHeight - lastEndHeight),
				elapsedMs: Date.now() - startedAt
			};
		}
	}

	const elapsedMs = Date.now() - startedAt;
	const remainingBehind = Math.max(0, bestHeight - lastEndHeight);

	return {
		chainId,
		skipped: false,
		bestHeight,
		startHeight,
		endHeight: lastEndHeight,
		indexed,
		remainingBehind,
		timedOut: remainingBehind > 0 && elapsedMs >= maxDurationMs,
		elapsedMs
	};
}

function refreshRpcTip(db, chainId, bestHeight) {
	const now = Date.now();
	const row = db.prepare(`
		SELECT
			last_indexed_height,
			last_indexed_hash,
			status,
			status_message
		FROM sync_state
		WHERE chain_id = ?
	`).get(chainId);

	db.prepare(`
		INSERT INTO sync_state (
			chain_id, best_rpc_height, last_indexed_height, last_indexed_hash,
			last_checked_height, status, status_message, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(chain_id) DO UPDATE SET
			best_rpc_height = excluded.best_rpc_height,
			last_checked_height = excluded.last_checked_height,
			updated_at = excluded.updated_at
	`).run(
		chainId,
		bestHeight,
		row ? row.last_indexed_height : null,
		row ? row.last_indexed_hash : null,
		bestHeight,
		row ? row.status || "idle" : "idle",
		row ? row.status_message : null,
		now
	);
}

module.exports = {
	syncToTip,
	refreshRpcTip,
	isTipSyncEnabled
};
