"use strict";

const utils = require("../utils.js");
const { isCoinbaseTx, isCoinstakeTx } = require("./valueUtils.js");
const { chainIdToTicker, mapMinerFields } = require("./miningPoolConfigs.js");

function findProducerTx(txs, chainId) {
	if (!Array.isArray(txs)) {
		return null;
	}

	const chain = String(chainId || "").toLowerCase();

	if (chain === "vrc") {
		for (const tx of txs) {
			if (tx && typeof tx === "object" && isCoinstakeTx(tx)) {
				return tx;
			}
		}
	}

	for (const tx of txs) {
		if (tx && typeof tx === "object" && isCoinbaseTx(tx)) {
			return tx;
		}
	}

	return txs.length > 0 && typeof txs[0] === "object" ? txs[0] : null;
}

function identifyBlockProducer(producerTx, blockHeight, chainId) {
	if (!producerTx) {
		return null;
	}

	const ticker = chainIdToTicker(chainId);

	if (isCoinstakeTx(producerTx)) {
		return utils.identifyStaker(producerTx, Number(blockHeight), ticker);
	}

	return utils.identifyMiner(producerTx, Number(blockHeight), ticker);
}

function mapBlockProducerFields(producerTx, blockHeight, chainId) {
	return mapMinerFields(identifyBlockProducer(producerTx, blockHeight, chainId));
}

function blockHasProducer(block, chainId) {
	const chain = String(chainId || "").toLowerCase();

	if (chain === "vrc" || chain === "vrm") {
		return !!(block.extractedBy || block.extractedByAddress);
	}

	return true;
}

module.exports = {
	findProducerTx,
	identifyBlockProducer,
	mapBlockProducerFields,
	blockHasProducer,
};
