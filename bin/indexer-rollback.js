#!/usr/bin/env node
'use strict';

require('../app/indexerV2/loadEnv.js');

const { rollbackFromHeight } = require('../app/indexerV2/reorg.js');
const dbModule = require('../app/indexerV2/db.js');

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.chain || args.from === undefined) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

try {
  const result = rollbackFromHeight(args.chain, Number(args.from));

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

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
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
  node bin/indexer-rollback.js --chain vrm --from 1091600

Options:
  --chain   Chain id: vrc or vrm
  --from    Roll back this height and every indexed block after it.
`);
}
