#!/usr/bin/env node
"use strict";

const { repairUnresolvedInputs } = require("../app/indexerV2/repair.js");
const dbModule = require("../app/indexerV2/db.js");

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.chain) {
	printHelp();
	process.exit(args.help ? 0 : 1);
}

try {
	const result = repairUnresolvedInputs(args.chain, {
		limit: args.limit === undefined ? undefined : Number(args.limit)
	});

	console.log(JSON.stringify(result, null, 2));
	dbModule.closeDatabase();
} catch (err) {
	console.error(err.stack || err.message);
	dbModule.closeDatabase();
	process.exit(1);
}

function parseArgs(argv) {
	const result = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "--help" || arg === "-h") {
			result.help = true;
		} else if (arg.startsWith("--")) {
			const key = arg.substring(2);
			const next = argv[i + 1];
			if (!next || next.startsWith("--")) {
				result[key] = true;
			} else {
				result[key] = next;
				i++;
			}
		}
	}

	return result;
}

function printHelp() {
	console.log(`
Usage:
  node bin/indexer-repair.js --chain vrm --limit 1000

Options:
  --chain   Chain id: vrc or vrm
  --limit   Maximum unresolved inputs to scan in this pass. Defaults to 1000.
`);
}
