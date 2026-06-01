#!/usr/bin/env node
"use strict";

require("../app/indexerV2/loadEnv.js");

const dbModule = require("../app/indexerV2/db.js");
const { loadAllMiningPoolConfigs } = require("../app/indexerV2/miningPoolConfigs.js");
const { backfillChain } = require("../app/indexerV2/backfillMiners.js");

loadAllMiningPoolConfigs();

const chainId = process.argv[2] ? String(process.argv[2]).toLowerCase() : "vrm";
const db = dbModule.openDatabase(undefined, {
	skipSeed: true,
	busyTimeoutMs: 120_000,
});

console.log(JSON.stringify(backfillChain(db, chainId), null, 2));
dbModule.closeDatabase();
