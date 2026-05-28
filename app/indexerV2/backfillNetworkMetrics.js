#!/usr/bin/env node
"use strict";

require("./loadEnv.js");

const dbModule = require("./db.js");
const { backfillFromBlocks } = require("./networkMetrics.js");

function parseArgs(argv) {
	const result = { chain: null, since: null, sampleEveryHours: 1 };

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--chain" && argv[i + 1]) {
			result.chain = String(argv[i + 1]).toLowerCase();
			i += 1;
		} else if (arg === "--since" && argv[i + 1]) {
			result.since = Number(argv[i + 1]);
			i += 1;
		} else if (arg === "--sample-every-hours" && argv[i + 1]) {
			result.sampleEveryHours = Number(argv[i + 1]);
			i += 1;
		}
	}

	return result;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.chain) {
		console.error("Usage: node app/indexerV2/backfillNetworkMetrics.js --chain vrm|vrc [--since unix] [--sample-every-hours 1]");
		process.exit(1);
	}

	const db = dbModule.openDatabase();
	const result = backfillFromBlocks(db, args.chain, {
		since: args.since,
		sampleEveryHours: args.sampleEveryHours
	});

	console.log(JSON.stringify(result, null, 2));
	dbModule.closeDatabase();
}

main();
