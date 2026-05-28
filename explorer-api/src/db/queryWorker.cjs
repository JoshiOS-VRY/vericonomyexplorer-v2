"use strict";

const { parentPort } = require("node:worker_threads");
const path = require("node:path");

require(path.join(__dirname, "..", "..", "..", "app", "indexerV2", "loadEnv.js"));

const Database = require("better-sqlite3");
const dbModule = require(path.join(__dirname, "..", "..", "..", "app", "indexerV2", "db.js"));
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
	dbModule.applyReadPragmas(db);

	return db;
}

function getLandingBundle(options = {}) {
	const workerDb = getWorkerDb();
	const shared = Object.assign({}, options, { db: workerDb, skipLiveBlocks: true });

	return {
		vrmSummary: query.getChainSummary("vrm", shared),
		vrcSummary: query.getChainSummary("vrc", shared),
		vrmRichlist: query.getRichlist("vrm", Object.assign({}, shared, { limit: 5 })),
		vrcRichlist: query.getRichlist("vrc", Object.assign({}, shared, { limit: 5 })),
		vrmLeaderboard: query.getLeaderboard("vrm", Object.assign({}, shared, {
			period: "month",
			sort: "activity",
			limit: 5
		}))
	};
}

function getVrmDashboardBundle(options = {}) {
	const workerDb = getWorkerDb();
	const shared = Object.assign({}, options, { db: workerDb, skipLiveBlocks: true });
	const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;

	return {
		summary: query.getChainSummary("vrm", shared),
		richlist: query.getRichlist("vrm", Object.assign({}, shared, { limit: 5 })),
		leaderboard: query.getLeaderboard("vrm", Object.assign({}, shared, {
			period: "month",
			sort: "activity",
			limit: 5
		})),
		activityHistory: query.getChainActivityHistory("vrm", Object.assign({}, shared, {
			since: since30d,
			maxPoints: 100
		}))
	};
}

const handlers = {
	getChainSummaryIndexed: query.getChainSummary,
	getBlockIndexed: query.getBlock,
	getIndexerHealthIndexed: health.getIndexerHealth,
	getLandingBundle,
	getVrmDashboardBundle,
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
