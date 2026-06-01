#!/usr/bin/env node
"use strict";

require("../app/indexerV2/loadEnv.js");

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.chain) {
  console.error("Missing required --chain");
  printHelp();
  process.exit(1);
}

const { syncRange } = require("../app/indexerV2/worker.js");
const dbModule = require("../app/indexerV2/db.js");

const idleMs = Number(args["idle-ms"] === undefined ? 5000 : args["idle-ms"]);
const errorMs = Number(
  args["error-ms"] === undefined ? 10000 : args["error-ms"],
);
const logEvery = getLogEvery(args["log-every"]);
const chain = args.chain;

let stopping = false;

process.on("SIGINT", handleStop);
process.on("SIGTERM", handleStop);

function handleStop() {
  if (stopping) {
    return;
  }

  stopping = true;
  console.log(`\n[${chain}] indexer loop shutting down...`);
}

runLoop().catch((err) => {
  console.error(err.stack || err.message);
  dbModule.closeDatabase();
  process.exit(1);
});

async function runLoop() {
  const indexOnly = args["index-only"] === true;
  console.log(
    `[${chain}] indexer loop started (idle-ms=${idleMs}, error-ms=${errorMs}${indexOnly ? ", index-only=1" : ""})`,
  );
  if (indexOnly) {
    console.log(
      `[${chain}] index-only mode: skipping live insights buckets/fees; run backfills after tip`,
    );
  }

  while (!stopping) {
    try {
      const result = await syncRange(buildSyncOptions());
      console.log(JSON.stringify(result, null, 2));

      if (stopping) {
        break;
      }

      const waitMs = getIdleWaitMs(result);
      if (waitMs > 0) {
        console.log(
          `[${chain}] caught up at height ${result.endHeight}; waiting ${waitMs}ms`,
        );
        const checkpoint = dbModule.maybeCheckpointWal();
        if (checkpoint.ran) {
          console.log(
            `[${chain}] wal checkpoint ${checkpoint.walSizeMbBefore?.toFixed(1)}MB -> ${checkpoint.walSizeMbAfter?.toFixed(1)}MB`,
          );
        }
        await sleep(waitMs);
      }
    } catch (err) {
      console.error(`[${chain}] sync failed: ${err.stack || err.message}`);
      if (stopping) {
        break;
      }

      console.log(`[${chain}] retrying in ${errorMs}ms`);
      await sleep(errorMs);
    }
  }

  dbModule.closeDatabase();
}

function buildSyncOptions() {
  return {
    chain,
    startHeight: args.start === undefined ? undefined : Number(args.start),
    endHeight: args.end === undefined ? undefined : Number(args.end),
    configPath: args.config,
    force: args.force === true,
    batchSize:
      args["batch-size"] === undefined ? undefined : Number(args["batch-size"]),
    pauseMs:
      args["pause-ms"] === undefined ? undefined : Number(args["pause-ms"]),
    storeRawJson: parseStoreRawJson(args["store-raw-json"]),
    autoRollback: parseAutoRollback(args["auto-rollback"]),
    indexOnly: args["index-only"] === true,
    rpcBatchSize:
      args["rpc-batch-size"] === undefined
        ? undefined
        : Number(args["rpc-batch-size"]),
    onProgress: (info) => {
      if (info.rolledBack) {
        const rollback = info.rollback || {};
        console.log(
          `[${info.chainId}] rolled back from block ${rollback.fromHeight} to ${rollback.newTipHeight === null ? "empty" : rollback.newTipHeight}`,
        );
        return;
      }

      if (!shouldLogProgress(info, logEvery)) {
        return;
      }

      const action = info.skipped ? "skipped" : "indexed";
      const memory = info.memory
        ? ` rss=${info.memory.rssMb}MB heap=${info.memory.heapUsedMb}/${info.memory.heapTotalMb}MB`
        : "";
      console.log(
        `[${info.chainId}] ${action} block ${info.height}/${info.endHeight} ${info.hash}${memory}`,
      );
    },
  };
}

function getIdleWaitMs(result) {
  return idleMs;
}

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--force") {
      result.force = true;
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

function parseStoreRawJson(value) {
  if (value === undefined) {
    return undefined;
  }

  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function parseAutoRollback(value) {
  if (value === undefined) {
    return undefined;
  }

  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function getLogEvery(value) {
  const parsed = Number(value === undefined ? 1 : value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function shouldLogProgress(info, interval) {
  return info.height === info.endHeight || info.height % interval === 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`
Usage:
  node bin/indexer-v2-loop.js --chain vrc --batch-size 100 --pause-ms 500
  node bin/indexer-v2-loop.js --chain vrm

Runs the indexer continuously: syncs to the current RPC tip, waits, then checks again.

Options:
  --chain            Chain id or ticker: vrc, vrm, vericoin, verium
  --start            Start block height. Defaults to resume height.
  --end              End block height. Defaults to current RPC best height.
  --config           Path to chains config. Defaults to configs/chains.json.
  --force            Re-index an already indexed height with the same hash.
  --batch-size       Pause after this many newly indexed blocks when --pause-ms is set.
  --pause-ms         Milliseconds to pause between batches during a sync run.
  --idle-ms          Milliseconds to wait between sync runs when caught up. Default: 30000.
  --error-ms         Milliseconds to wait after a failed sync run. Default: 10000.
  --store-raw-json   true/false. Overrides the chain indexer.storeRawJson setting.
  --auto-rollback    true/false. Defaults to true; rolls back mismatched indexed heights.
  --log-every        Print progress every N heights. Defaults to 1.
  --index-only       Fast catch-up: core chain data only; defer insights buckets/fees to backfill.
  --rpc-batch-size   RPC batch window when --index-only is set. Default: 100 (env VCEXP_INDEX_ONLY_RPC_BATCH).
`);
}
