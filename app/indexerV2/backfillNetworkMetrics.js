#!/usr/bin/env node
"use strict";

require("./loadEnv.js");

const dbModule = require("./db.js");
const { backfillFromBlocks, backfillAddressGrowth } = require("./networkMetrics.js");

function parseArgs(argv) {
	const result = {
		chain: null,
		since: null,
		sampleEveryHours: 1,
		addressGrowthOnly: false,
		skipSupply: false
	};

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
		} else if (arg === "--address-growth-only") {
			result.addressGrowthOnly = true;
		} else if (arg === "--skip-supply") {
			result.skipSupply = true;
		}
	}

	return result;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.chain) {
		console.error(
			"Usage: node app/indexerV2/backfillNetworkMetrics.js --chain vrm|vrc "
			+ "[--since unix] [--sample-every-hours 1] [--address-growth-only]"
		);
		process.exit(1);
	}

	const db = dbModule.openDatabase(undefined, {
		skipHeavyBackfills: args.addressGrowthOnly
	});

	const result = args.addressGrowthOnly
		? await backfillAddressGrowth(db, args.chain, {
			since: args.since,
			sampleEveryHours: args.sampleEveryHours
		})
		: await backfillFromBlocks(db, args.chain, {
			since: args.since,
			sampleEveryHours: args.sampleEveryHours,
			skipSupplySeries: args.skipSupply || args.since != null
		});

	console.log(JSON.stringify(result, null, 2));
	dbModule.closeDatabase();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
