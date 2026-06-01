"use strict";

const assert = require("assert");

const dbModule = require("./db.js");
const tipSync = require("./tipSync.js");
const health = require("./health.js");

async function run() {
	const result = await tipSync.syncToTip("vrm", { pageType: "chain" });

	assert.ok(result.chainId === "vrm");
	assert.ok(result.skipped === true || typeof result.bestHeight === "number");
	if (result.skipped) {
		assert.ok(["rpc-unavailable", "rpc-error", "disabled", "already-at-tip"].includes(result.reason));
	}

	const db = dbModule.openDatabase();
	const lite = health.getChainHealthLite("vrm", { db });
	assert.ok(lite.heights);
	assert.ok(lite.sourceLabels);

	dbModule.closeDatabase();

	console.log(JSON.stringify({
		ok: true,
		tipSync: result,
		liteStatus: lite.status
	}, null, 2));
}

run().catch(err => {
	console.error(err);
	process.exit(1);
});
