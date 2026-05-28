"use strict";

const utils = require("../utils.js");
const { getChainConfig, getRpcCredentials } = require("./chainConfig.js");
const { createRpcClient } = require("./rpcClient.js");

async function getTip(chainId, options = {}) {
	const rpc = getClient(chainId, options);
	const height = await rpc.call("getblockcount");
	const hash = await rpc.call("getblockhash", [height]);

	return {
		height: Number(height),
		hash
	};
}

async function getRecentBlocks(chainId, count = 10, options = {}) {
	const rpc = getClient(chainId, options);
	const verbosity = options.blockVerbosity ?? 2;
	const tipHeight = options.tipHeight != null
		? Number(options.tipHeight)
		: Number(await rpc.call("getblockcount"));
	const maxCount = Math.max(1, Math.min(count, 50));
	let startHeight;

	if (options.fromHeight != null) {
		startHeight = Math.max(0, Number(options.fromHeight));
	} else {
		startHeight = Math.max(0, tipHeight - maxCount + 1);
	}

	const heights = [];
	for (let height = tipHeight; height >= startHeight && heights.length < maxCount; height--) {
		heights.push(height);
	}

	if (heights.length === 0) {
		return [];
	}

	if (typeof rpc.batch === "function") {
		const hashResults = await rpc.batch(
			heights.map((height) => ({ method: "getblockhash", params: [height] }))
		);
		const blockResults = await rpc.batch(
			hashResults.map((hash) => ({ method: "getblock", params: [hash, verbosity] }))
		);
		return blockResults.map((block) => mapRpcBlock(block, verbosity));
	}

	const blocks = await Promise.all(heights.map(async (height) => {
		const hash = await rpc.call("getblockhash", [height]);
		const block = await rpc.call("getblock", [hash, verbosity]);
		return mapRpcBlock(block, verbosity);
	}));

	return blocks;
}

async function enrichBlockMiners(chainId, blocks, options = {}) {
	if (!Array.isArray(blocks) || blocks.length === 0) {
		return blocks;
	}

	const needsMiner = blocks.filter(
		(block) => block && !block.extractedBy && !block.extractedByAddress
	);
	if (needsMiner.length === 0) {
		return blocks;
	}

	const rpc = getClient(chainId, options);
	const hashes = needsMiner.map((block) => block.hash);
	let fullBlocks;

	if (typeof rpc.batch === "function") {
		fullBlocks = await rpc.batch(
			hashes.map((hash) => ({ method: "getblock", params: [hash, 2] }))
		);
	} else {
		fullBlocks = await Promise.all(
			hashes.map((hash) => rpc.call("getblock", [hash, 2]))
		);
	}

	const minerByHash = Object.fromEntries(
		fullBlocks.map((block) => {
			const mapped = mapRpcBlock(block, 2);
			return [mapped.hash, mapped];
		})
	);

	return blocks.map((block) => {
		const enriched = minerByHash[block.hash];
		if (!enriched) {
			return block;
		}

		return Object.assign({}, block, {
			outputCount: block.outputCount ?? enriched.outputCount ?? null,
			extractedBy: block.extractedBy ?? enriched.extractedBy ?? null,
			extractedByAddress: block.extractedByAddress ?? enriched.extractedByAddress ?? null
		});
	});
}

function mapRpcBlock(block, verbosity = 2) {
	const txs = Array.isArray(block.tx) ? block.tx : [];
	const coinbaseTx = verbosity >= 2 && txs.length > 0 && typeof txs[0] === "object" ? txs[0] : null;
	const miner = coinbaseTx ? utils.identifyMiner(coinbaseTx, Number(block.height)) : null;

	return {
		height: Number(block.height),
		hash: block.hash,
		previousHash: block.previousblockhash || null,
		nextHash: null,
		time: Number(block.time),
		txCount: block.nTx != null ? Number(block.nTx) : txs.length,
		size: block.size == null ? null : Number(block.size),
		difficulty: block.difficulty == null ? null : String(block.difficulty),
		outputCount: verbosity >= 2 ? countBlockOutputs(block) : null,
		extractedBy: miner ? miner.name : null,
		extractedByAddress: miner && miner.type === "address-only" ? miner.name : null
	};
}

function countBlockOutputs(block) {
	if (!Array.isArray(block.tx)) {
		return null;
	}

	let count = 0;
	for (const tx of block.tx) {
		if (tx && Array.isArray(tx.vout)) {
			count += tx.vout.length;
		}
	}

	return count;
}

function getClient(chainId, options = {}) {
	if (options.rpc) {
		return options.rpc;
	}

	const chainConfig = getChainConfig(chainId, options.configPath);
	return createRpcClient(getRpcCredentials(chainConfig));
}

async function getBlockFromRpc(chainId, hashOrHeight, options = {}) {
	const rpc = getClient(chainId, options);
	const value = String(hashOrHeight || "").trim();

	if (!value) {
		return { chainId, query: value, found: false };
	}

	let hash = value;
	if (/^\d+$/.test(value)) {
		hash = await rpc.call("getblockhash", [Number(value)]);
	}

	const block = await rpc.call("getblock", [hash, 2]);
	let nextHash = null;

	try {
		nextHash = await rpc.call("getblockhash", [block.height + 1]);
	} catch (err) {
		nextHash = null;
	}

	const transactions = (block.tx || []).map((tx, txIndex) => mapRpcTransaction(tx, block, txIndex));

	return {
		chainId: String(chainId).toLowerCase(),
		found: true,
		block: {
			height: Number(block.height),
			hash: block.hash,
			previousHash: block.previousblockhash || null,
			nextHash,
			time: Number(block.time),
			txCount: transactions.length,
			size: block.size == null ? null : Number(block.size),
			difficulty: block.difficulty == null ? null : String(block.difficulty)
		},
		transactions,
		paging: {
			limit: transactions.length,
			offset: 0,
			total: transactions.length,
			hasMore: false
		}
	};
}

function mapRpcTransaction(tx, block, txIndex) {
	const isCoinbase = Array.isArray(tx.vin)
		&& tx.vin.length === 1
		&& tx.vin[0].coinbase != null;

	return {
		txid: tx.txid,
		blockHeight: Number(block.height),
		blockHash: block.hash,
		txIndex,
		time: tx.time == null ? Number(block.time) : Number(tx.time),
		isCoinbase,
		isCoinstake: false,
		source: "rpc"
	};
}

module.exports = {
	getTip,
	getRecentBlocks,
	enrichBlockMiners,
	getBlockFromRpc,
	mapRpcBlock
};
