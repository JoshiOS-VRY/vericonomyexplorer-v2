#!/usr/bin/env node
'use strict';

require('../app/indexerV2/loadEnv.js');

const dbModule = require('../app/indexerV2/db.js');
const { backfillAddressGrowth } = require('../app/indexerV2/networkMetrics.js');

function parseArgs(argv) {
  const result = { chain: null, since: null, sampleEveryHours: 1 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--chain' && argv[i + 1]) {
      result.chain = String(argv[i + 1]).toLowerCase();
      i += 1;
    } else if (arg === '--since' && argv[i + 1]) {
      result.since = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--sample-every-hours' && argv[i + 1]) {
      result.sampleEveryHours = Number(argv[i + 1]);
      i += 1;
    }
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.chain) {
    console.error(
      'Usage: npm run indexer:backfill-address-growth -- --chain vrm|vrc ' +
        '[--since unix] [--sample-every-hours 1]'
    );
    process.exit(1);
  }

  const db = dbModule.openDatabase(undefined, { skipHeavyBackfills: true });
  const result = backfillAddressGrowth(db, args.chain, {
    since: args.since,
    sampleEveryHours: args.sampleEveryHours,
  });

  console.log(JSON.stringify(result, null, 2));
  dbModule.closeDatabase();
}

main();
