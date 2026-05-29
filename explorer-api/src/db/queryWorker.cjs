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
	const vrmHealth = health.getChainHealth("vrm", shared);
	const vrcHealth = health.getChainHealth("vrc", shared);
	const vrmOpts = Object.assign({}, shared, { chainHealth: vrmHealth });
	const vrcOpts = Object.assign({}, shared, { chainHealth: vrcHealth });

	return {
		vrmSummary: query.getChainSummary("vrm", vrmOpts),
		vrcSummary: query.getChainSummary("vrc", vrcOpts),
		vrmRichlist: query.getRichlist("vrm", Object.assign({}, vrmOpts, { limit: 5 })),
		vrcRichlist: query.getRichlist("vrc", Object.assign({}, vrcOpts, { limit: 5 })),
		vrmLeaderboard: query.getLeaderboard("vrm", Object.assign({}, vrmOpts, {
			period: "month",
			sort: "activity",
			limit: 5
		}))
	};
}

function getVrmDashboardBundle(options = {}) {
	const workerDb = getWorkerDb();
	const shared = Object.assign({}, options, { db: workerDb, skipLiveBlocks: true });
	const vrmHealth = health.getChainHealth("vrm", shared);
	const vrmOpts = Object.assign({}, shared, { chainHealth: vrmHealth });
	const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;

	return {
		summary: query.getChainSummary("vrm", vrmOpts),
		richlist: query.getRichlist("vrm", Object.assign({}, vrmOpts, { limit: 5 })),
		leaderboard: query.getLeaderboard("vrm", Object.assign({}, vrmOpts, {
			period: "month",
			sort: "activity",
			limit: 5
		})),
		miners: query.getMinedLeaderboard("vrm", Object.assign({}, vrmOpts, {
			period: "month",
			limit: 5
		})),
		activityHistory: query.getChainActivityHistory("vrm", Object.assign({}, vrmOpts, {
			since: since30d,
			maxPoints: 100
		}))
	};
}

const handlers = {
	getChainSummaryIndexed: query.getChainSummary,
	getChainSummaryLiteIndexed: query.getChainSummaryLite,
	getLatestBlocksIndexed: query.getLatestBlocks,
	getBlocksPageIndexed: query.getBlocksPage,
	getBlockIndexed: query.getBlock,
	getIndexerHealthIndexed: health.getIndexerHealth,
	getLandingBundle,
	getVrmDashboardBundle,
	getRichlist: query.getRichlist,
	getLeaderboard: query.getLeaderboard,
	getMinedLeaderboard: query.getMinedLeaderboard,
	getAddress: query.getAddress,
	getAddressBalanceHistory: query.getAddressBalanceHistory,
	getChainActivityHistory: query.getChainActivityHistory,
	getNetworkMetricHistory: query.getNetworkMetricHistory,
	getAddressUtxos: query.getAddressUtxos,
	getTransaction: query.getTransaction,
	getTransactionRelatedAddresses: query.getTransactionRelatedAddresses,
	getChainHealth: health.getChainHealth,
	enrichBlockInterestRatesIndexed: query.enrichBlockInterestRates,
	getIndexedSupplyAtHeight: query.getIndexedSupplyAtHeight,
	getIndexedHashrate7dAvg: query.getIndexedHashrate7dAvg,
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
