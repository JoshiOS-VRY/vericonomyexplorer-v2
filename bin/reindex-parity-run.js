#!/usr/bin/env node
'use strict';

/**
 * One-shot RPC reindex from height 0 to tip (index-only: core tables only).
 * Target: isolated Postgres (VCEXP_PG_URL), not production vericonomy-postgres.
 *
 * Usage:
 *   VCEXP_DB_BACKEND=postgres VCEXP_PG_URL=... node bin/reindex-parity-run.js --chain vrm
 */

require('../app/indexerV2/loadEnv.js');

const { syncRange, getResumeHeight, normalizeChainId } = require('../app/indexerV2/worker.js');
const dbModule = require('../app/indexerV2/db.js');
const { closePostgres } = require('../app/indexerV2/pgClient.js');

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.chain) {
  console.log(`
Usage:
  node bin/reindex-parity-run.js --chain vrm|vrc [--from 0] [--log-every N]

Loops syncRange until caught up. Uses --index-only (no insights buckets).
`);
  process.exit(args.help ? 0 : 1);
}

const chain = normalizeChainId(args.chain);
const fromHeight = args.from === undefined ? 0 : Number(args.from);
const logEvery = Number(process.env.VCEXP_REINDEX_LOG_EVERY || args['log-every'] || 500);

function logProgress(info) {
  if (!info.rolledBack && info.height % logEvery !== 0 && info.height !== info.endHeight) {
    return;
  }

  process.stdout.write(
    `[${chain}] height=${info.height}/${info.endHeight} indexed=${info.indexedInPass ?? ''} mem=${info.memory?.rssMb ?? '?'}MB\n`
  );
}

async function main() {
  const db = dbModule.openDatabase();
  let startHeight = fromHeight;

  if (fromHeight === 0) {
    const resume = await getResumeHeight(db, chain);
    if (resume > 0) {
      startHeight = resume;
      console.log(`[${chain}] resuming from height ${startHeight}`);
    } else {
      console.log(`[${chain}] starting fresh from height 0`);
    }
  }

  const started = Date.now();
  let totalIndexed = 0;
  let pass = 0;

  while (true) {
    pass += 1;
    const result = await syncRange({
      chain,
      startHeight,
      indexOnly: true,
      storeRawJson: false,
      autoRollback: true,
      onProgress: logProgress,
    });

    totalIndexed += result.indexed;
    console.log(
      JSON.stringify({
        pass,
        ...result,
        totalIndexed,
        elapsedSec: Math.round((Date.now() - started) / 1000),
      })
    );

    if (result.caughtUp || result.indexed === 0) {
      console.log(`[${chain}] reindex complete at height ${result.endHeight}`);
      break;
    }

    startHeight = result.endHeight + 1;
  }

  await closePostgres();
  process.exit(0);
}

function parseArgs(argv) {
  const out = { help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') out.help = true;
    else if (token === '--chain') out.chain = argv[++i];
    else if (token === '--from') out.from = argv[++i];
    else if (token === '--log-every') out['log-every'] = argv[++i];
  }
  return out;
}

main().catch(async (err) => {
  console.error(err.stack || err.message);
  try {
    await closePostgres();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
