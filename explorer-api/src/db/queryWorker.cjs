"use strict";

const { parentPort } = require("node:worker_threads");
const path = require("node:path");

require(path.join(__dirname, "..", "..", "..", "app", "indexerV2", "loadEnv.js"));

const Database = require("better-sqlite3");
const query = require(path.join(__dirname, "..", "..", "..", "app", "indexerV2", "query.js"));
const health = require(path.join(__dirname, "..", "..", "..", "app", "indexerV2", "health.js"));

let db = null;

function getWorkerDb() {
  if (db) {
    return db;
  }

  const dbPath =
    process.env.VCEXP_INDEXER_SQLITE_PATH ??
    process.env.BTCEXP_INDEXER_SQLITE_PATH ??
    path.join(process.cwd(), "database", "vericonomy-index.sqlite");

  db = new Database(dbPath, { readonly: true });
  db.defaultSafeIntegers(true);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 10000");

  return db;
}

const handlers = {
  getRichlist: query.getRichlist,
  getLeaderboard: query.getLeaderboard,
  getAddress: query.getAddress,
  getAddressBalanceHistory: query.getAddressBalanceHistory,
  getChainActivityHistory: query.getChainActivityHistory,
  getAddressUtxos: query.getAddressUtxos,
  getTransaction: query.getTransaction,
  getChainHealth: health.getChainHealth,
};

parentPort.on("message", (message) => {
  const { id, method, args, options } = message;

  try {
    const handler = handlers[method];
    if (typeof handler !== "function") {
      throw new Error(`Unknown query worker method: ${method}`);
    }

    const workerDb = getWorkerDb();
    const result = handler(...args, { ...(options || {}), db: workerDb });
    parentPort.postMessage({ id, result });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

parentPort.postMessage({ ready: true });
