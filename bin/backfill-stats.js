#!/usr/bin/env node
"use strict";

require("../app/indexerV2/loadEnv.js");

const dbModule = require("../app/indexerV2/db.js");
const { backfillChain } = require("../app/indexerV2/backfillStats.js");

const chainId = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;
const db = dbModule.openDatabase(undefined, {
	skipHeavyBackfills: true,
	skipSeed: true,
	busyTimeoutMs: 120_000
});

if (chainId) {
	console.log(JSON.stringify(backfillChain(db, chainId), null, 2));
} else {
	console.log(
		JSON.stringify(["vrm", "vrc"].map((id) => backfillChain(db, id)), null, 2),
	);
}

dbModule.closeDatabase();
