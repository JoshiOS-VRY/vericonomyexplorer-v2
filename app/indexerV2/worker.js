"use strict";

const dbModule = require("./db.js");
const { getChainConfig, getRpcCredentials } = require("./chainConfig.js");
const { createRpcClient } = require("./rpcClient.js");
const { ingestBlock } = require("./ingest.js");
const { rollbackFromHeight } = require("./reorg.js");

async function syncRange(options = {}) {
	const chainId = normalizeChainId(options.chain || process.env.VCEXP_INDEXER_CHAIN || "vrm");
	const chainConfig = getChainConfig(chainId, options.configPath);
	const rpcCredentials = getRpcCredentials(chainConfig);
	const rpc = options.rpc || createRpcClient(rpcCredentials);
	const db = options.db || dbModule.openDatabase();
	const indexerConfig = chainConfig.indexer || {};
	const batchSize = Number(options.batchSize || indexerConfig.batchSize || 0);
	const pauseMs = Number(options.pauseMs === undefined ? indexerConfig.pauseMs || 0 : options.pauseMs);
	const storeRawJson = options.storeRawJson === undefined
		? indexerConfig.storeRawJson !== false
		: options.storeRawJson !== false;

	const bestHeight = await rpc.call("getblockcount");
	let startHeight = options.startHeight === undefined
		? getResumeHeight(db, chainConfig.id)
		: Number(options.startHeight);
	const requestedEndHeight = options.endHeight === undefined ? bestHeight : Number(options.endHeight);
	const endHeight = Math.min(requestedEndHeight, bestHeight);
	const autoRollback = options.autoRollback !== false;

	if (Number.isNaN(startHeight) || Number.isNaN(endHeight)) {
		throw new Error(`Invalid height range: start=${options.startHeight}, end=${options.endHeight}`);
	}

	if (startHeight > endHeight) {
		return {
			chainId: chainConfig.id,
			bestHeight,
			startHeight,
			endHeight,
			indexed: 0
		};
	}

	if (autoRollback && startHeight > 0) {
		const resumeCheck = await ensureResumeOnMainChain(db, rpc, chainConfig.id, startHeight, bestHeight);
		startHeight = resumeCheck.startHeight;

		if (resumeCheck.rollback && options.onProgress) {
			options.onProgress({
				chainId: chainConfig.id,
				height: resumeCheck.rollback.fromHeight,
				endHeight,
				hash: resumeCheck.rollback.newTipHash,
				rolledBack: true,
				rollback: resumeCheck.rollback,
				memory: getMemoryUsage()
			});
		}
	}

	let indexed = 0;
	for (let height = startHeight; height <= endHeight; height++) {
		const blockhash = await rpc.call("getblockhash", [height]);
		const existingHash = getIndexedBlockHash(db, chainConfig.id, height);

		if (autoRollback && existingHash && existingHash !== blockhash) {
			const rollback = rollbackFromHeight(chainConfig.id, height, { db });

			if (options.onProgress) {
				options.onProgress({
					chainId: chainConfig.id,
					height,
					endHeight,
					hash: blockhash,
					rolledBack: true,
					rollback,
					memory: getMemoryUsage()
				});
			}
		}

		const block = await rpc.call("getblock", [blockhash, 2]);
		const result = ingestBlock(chainConfig.id, block, {
			db,
			bestRpcHeight: bestHeight,
			force: options.force === true,
			storeRawJson
		});

		if (!result.skipped) {
			indexed++;
		}

		if (options.onProgress) {
			options.onProgress({
				chainId: chainConfig.id,
				height,
				endHeight,
				hash: blockhash,
				skipped: !!result.skipped,
				rolledBack: false,
				memory: getMemoryUsage()
			});
		}

		if (batchSize > 0 && pauseMs > 0 && height < endHeight && indexed > 0 && indexed % batchSize === 0) {
			await sleep(pauseMs);
		}
	}

	return {
		chainId: chainConfig.id,
		bestHeight,
		startHeight,
		endHeight,
		indexed
	};
}

async function ensureResumeOnMainChain(db, rpc, chainId, startHeight, bestHeight) {
	const previousHeight = startHeight - 1;
	const existingHash = getIndexedBlockHash(db, chainId, previousHeight);

	if (!existingHash || previousHeight > bestHeight) {
		return {
			startHeight
		};
	}

	const rpcHash = await rpc.call("getblockhash", [previousHeight]);
	if (existingHash === rpcHash) {
		return {
			startHeight
		};
	}

	let commonHeight = previousHeight - 1;
	while (commonHeight >= 0) {
		const indexedHash = getIndexedBlockHash(db, chainId, commonHeight);

		if (!indexedHash) {
			commonHeight--;
			continue;
		}

		const canonicalHash = await rpc.call("getblockhash", [commonHeight]);
		if (indexedHash === canonicalHash) {
			break;
		}

		commonHeight--;
	}

	const rollbackHeight = Math.max(0, commonHeight + 1);
	const rollback = rollbackFromHeight(chainId, rollbackHeight, { db });

	return {
		startHeight: rollbackHeight,
		rollback
	};
}

function getIndexedBlockHash(db, chainId, height) {
	const row = db.prepare(`
		SELECT hash
		FROM blocks
		WHERE chain_id = ? AND height = ? AND status = 'main'
	`).get(chainId, height);

	return row ? row.hash : null;
}

function getMemoryUsage() {
	const usage = process.memoryUsage();
	return {
		rssMb: Math.round(usage.rss / 1024 / 1024),
		heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
		heapTotalMb: Math.round(usage.heapTotal / 1024 / 1024)
	};
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getResumeHeight(db, chainId) {
	const row = db.prepare(`
		SELECT last_indexed_height
		FROM sync_state
		WHERE chain_id = ?
	`).get(chainId);

	if (!row || row.last_indexed_height === null || row.last_indexed_height === undefined) {
		return 0;
	}

	return Number(row.last_indexed_height) + 1;
}

function normalizeChainId(chain) {
	const normalized = String(chain).toLowerCase();
	if (normalized === "vericoin") {
		return "vrc";
	}

	if (normalized === "verium") {
		return "vrm";
	}

	return normalized;
}

module.exports = {
	syncRange,
	getResumeHeight,
	normalizeChainId
};
