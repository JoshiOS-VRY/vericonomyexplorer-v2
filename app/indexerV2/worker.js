"use strict";

const dbModule = require("./db.js");
const { getChainConfig, getRpcCredentials } = require("./chainConfig.js");
const { createRpcClient } = require("./rpcClient.js");
const { ingestBlock } = require("./ingest.js");
const { rollbackFromHeight } = require("./reorg.js");
const { resolveBlocksPerPass, yieldToReaders } = require("./yield.js");
const {
	resolveIndexOnly,
	resolveRpcBatchSize,
	resolveStoreRawJson
} = require("./indexOnly.js");

async function syncRange(options = {}) {
	const chainId = normalizeChainId(options.chain || process.env.VCEXP_INDEXER_CHAIN || "vrm");
	const chainConfig = getChainConfig(chainId, options.configPath);
	const rpcCredentials = getRpcCredentials(chainConfig);
	const rpc = options.rpc || createRpcClient(rpcCredentials);
	const db = options.db || dbModule.openDatabase();
	const indexerConfig = chainConfig.indexer || {};
	const indexOnly = resolveIndexOnly(options, indexerConfig);
	const rpcBatchSize = resolveRpcBatchSize(options, indexOnly);
	const storeRawJson = resolveStoreRawJson(options, indexerConfig, indexOnly);
	const batchSize = Number(options.batchSize || indexerConfig.batchSize || 0);
	const pauseMs = Number(options.pauseMs === undefined ? indexerConfig.pauseMs || 0 : options.pauseMs);
	const autoRollback = options.autoRollback !== false;

	const bestHeight = await rpc.call("getblockcount");
	let startHeight = options.startHeight === undefined
		? getResumeHeight(db, chainConfig.id)
		: Number(options.startHeight);
	const requestedEndHeight = options.endHeight === undefined ? bestHeight : Number(options.endHeight);
	let endHeight = Math.min(requestedEndHeight, bestHeight);
	const maxBlocksPerPass = resolveBlocksPerPass(options);
	if (maxBlocksPerPass > 0 && startHeight <= endHeight) {
		endHeight = Math.min(endHeight, startHeight + maxBlocksPerPass - 1);
	}

	if (Number.isNaN(startHeight) || Number.isNaN(endHeight)) {
		throw new Error(`Invalid height range: start=${options.startHeight}, end=${options.endHeight}`);
	}

	if (startHeight > endHeight) {
		return {
			chainId: chainConfig.id,
			bestHeight,
			startHeight,
			endHeight,
			indexed: 0,
			indexOnly,
			rpcBatchSize
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

	const ingestOptions = {
		db,
		bestRpcHeight: bestHeight,
		force: options.force === true,
		storeRawJson,
		indexOnly
	};

	let indexed = 0;

	if (indexOnly && rpcBatchSize > 1) {
		indexed = await syncRangeWithRpcBatch({
			db,
			rpc,
			chainId: chainConfig.id,
			startHeight,
			endHeight,
			rpcBatchSize,
			autoRollback,
			ingestOptions,
			onProgress: options.onProgress,
			batchSize,
			pauseMs
		});
	} else {
		indexed = await syncRangeSequential({
			db,
			rpc,
			chainId: chainConfig.id,
			startHeight,
			endHeight,
			autoRollback,
			ingestOptions,
			onProgress: options.onProgress,
			batchSize,
			pauseMs
		});
	}

	return {
		chainId: chainConfig.id,
		bestHeight,
		startHeight,
		endHeight,
		indexed,
		indexOnly,
		rpcBatchSize: indexOnly ? rpcBatchSize : 1,
		maxBlocksPerPass: maxBlocksPerPass > 0 ? maxBlocksPerPass : null,
		caughtUp: endHeight >= bestHeight
	};
}

async function syncRangeSequential(context) {
	let indexed = 0;

	for (let height = context.startHeight; height <= context.endHeight; height++) {
		const blockhash = await context.rpc.call("getblockhash", [height]);
		const block = await context.rpc.call("getblock", [blockhash, 2]);
		const ingested = await ingestHeight(context, height, blockhash, block);
		indexed += ingested;
		await maybePause(context, height, indexed);
		await yieldToReaders();
	}

	return indexed;
}

async function syncRangeWithRpcBatch(context) {
	let indexed = 0;

	for (let windowStart = context.startHeight; windowStart <= context.endHeight; windowStart += context.rpcBatchSize) {
		const windowEnd = Math.min(windowStart + context.rpcBatchSize - 1, context.endHeight);
		const heights = [];

		for (let height = windowStart; height <= windowEnd; height++) {
			heights.push(height);
		}

		const hashes = await context.rpc.batch(
			heights.map((height) => ({
				method: "getblockhash",
				params: [height]
			}))
		);

		const pending = [];

		for (let i = 0; i < heights.length; i++) {
			const height = heights[i];
			const blockhash = hashes[i];
			const existingHash = getIndexedBlockHash(context.db, context.chainId, height);

			if (context.autoRollback && existingHash && existingHash !== blockhash) {
				const rollback = rollbackFromHeight(context.chainId, height, { db: context.db });

				if (context.onProgress) {
					context.onProgress({
						chainId: context.chainId,
						height,
						endHeight: context.endHeight,
						hash: blockhash,
						rolledBack: true,
						rollback,
						memory: getMemoryUsage()
					});
				}
			}

			pending.push({ height, blockhash });
		}

		const blocks = await context.rpc.batch(
			pending.map((entry) => ({
				method: "getblock",
				params: [entry.blockhash, 2]
			}))
		);

		for (let i = 0; i < pending.length; i++) {
			const entry = pending[i];
			const ingested = await ingestHeight(context, entry.height, entry.blockhash, blocks[i]);
			indexed += ingested;
		}

		await maybePause(context, windowEnd, indexed);
		await yieldToReaders();
	}

	return indexed;
}

async function ingestHeight(context, height, blockhash, block) {
	if (!block) {
		throw new Error(`Missing block payload for height ${height}`);
	}

	const result = ingestBlock(context.chainId, block, context.ingestOptions);
	const ingested = result.skipped ? 0 : 1;

	if (context.onProgress) {
		context.onProgress({
			chainId: context.chainId,
			height,
			endHeight: context.endHeight,
			hash: blockhash,
			skipped: !!result.skipped,
			rolledBack: false,
			memory: getMemoryUsage()
		});
	}

	return ingested;
}

async function maybePause(context, height, indexed) {
	if (context.batchSize > 0 && context.pauseMs > 0 && height < context.endHeight && indexed > 0 && indexed % context.batchSize === 0) {
		await sleep(context.pauseMs);
	}
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
	normalizeChainId,
	resolveIndexOnly,
	resolveRpcBatchSize,
	resolveStoreRawJson
};
