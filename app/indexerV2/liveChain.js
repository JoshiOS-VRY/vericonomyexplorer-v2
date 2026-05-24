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
	const tipHeight = Number(await rpc.call("getblockcount"));
	const limit = Math.max(1, Math.min(count, 50));
	const startHeight = Math.max(0, tipHeight - limit + 1);
	const heights = [];

	for (let height = tipHeight; height >= startHeight; height--) {
		heights.push(height);
	}

	const blocks = await Promise.all(heights.map(async (height) => {
		const hash = await rpc.call("getblockhash", [height]);
		const block = await rpc.call("getblock", [hash, 2]);
		return mapRpcBlock(block);
	}));

	return blocks;
}

function mapRpcBlock(block) {
	const txs = Array.isArray(block.tx) ? block.tx : [];
	const coinbaseTx = txs.length > 0 && typeof txs[0] === "object" ? txs[0] : null;
	const miner = coinbaseTx ? utils.identifyMiner(coinbaseTx, Number(block.height)) : null;

	return {
		height: Number(block.height),
		hash: block.hash,
		previousHash: block.previousblockhash || null,
		nextHash: null,
		time: Number(block.time),
		txCount: txs.length,
		size: block.size == null ? null : Number(block.size),
		difficulty: block.difficulty == null ? null : String(block.difficulty),
		outputCount: countBlockOutputs(block),
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
	getBlockFromRpc,
	mapRpcBlock
};
