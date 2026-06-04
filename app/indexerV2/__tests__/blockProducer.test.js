"use strict";

const assert = require("assert");
const utils = require("../../utils.js");
const { isCoinstakeTx } = require("../valueUtils.js");
const {
	findProducerTx,
	identifyBlockProducer,
	mapBlockProducerFields,
} = require("../blockProducer.js");

const coinstakeTx = {
	blockhash: "abc",
	vin: [{ txid: "deadbeef", vout: 1 }],
	vout: [
		{ value: 0, scriptPubKey: { type: "nonstandard" } },
		{
			value: 2.5,
			scriptPubKey: { address: "VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR" },
		},
	],
};

assert.ok(isCoinstakeTx(coinstakeTx), "fixture should be coinstake");

const producer = findProducerTx([coinstakeTx], "vrc");
assert.equal(producer, coinstakeTx);

const staker = identifyBlockProducer(coinstakeTx, 1_000_000, "vrc");
assert.ok(staker, "coinstake should identify staker");
assert.equal(staker.name, "VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR");

const mapped = mapBlockProducerFields(coinstakeTx, 1_000_000, "vrc");
assert.equal(mapped.extractedByAddress, "VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR");
assert.equal(mapped.extractedBy, null);

const direct = utils.identifyStaker(coinstakeTx, 1_000_000, "VRC");
assert.equal(direct.name, "VSMqKZYWvnBZ6A577rAQCyrJRmyyeHuSPR");

console.log("blockProducer tests passed");
