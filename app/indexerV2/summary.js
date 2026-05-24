"use strict";

const dbModule = require("./db.js");
const health = require("./health.js");
const liveChain = require("./liveChain.js");
const indexerQuery = require("./query.js");

async function getChainSummary(chainId, options = {}) {
	const summary = indexerQuery.getChainSummary(chainId, options);

	try {
		const tip = options.tip ?? await liveChain.getTip(chainId, options);
		summary.health = health.enrichWithLiveRpc(summary.health, tip.height, options);
		const indexedHeight = summary.health.heights.maxIndexedHeight;

		if (!options.skipLiveBlocks && (indexedHeight === null || tip.height > indexedHeight)) {
			summary.latestBlocks = await liveChain.getRecentBlocks(chainId, 10, options);
		}
	} catch (err) {
		summary.health = Object.assign({}, summary.health, {
			explorerStatus: {
				label: "Offline",
				message: "Unable to reach the chain node.",
				syncing: false
			}
		});
	}

	return summary;
}

async function getLandingData(options = {}) {
	const db = options.db || dbModule.openDatabase();
	const shared = Object.assign({}, options, { db, skipLiveBlocks: true });

	const [vrmRichlist, vrcRichlist, vrmLeaderboard, vrmSummary, vrcSummary] = await Promise.all([
		Promise.resolve(indexerQuery.getRichlist("vrm", Object.assign({}, shared, { limit: 5 }))),
		Promise.resolve(indexerQuery.getRichlist("vrc", Object.assign({}, shared, { limit: 5 }))),
		Promise.resolve(indexerQuery.getLeaderboard("vrm", Object.assign({}, shared, {
			period: "month",
			sort: "activity",
			limit: 5
		}))),
		getChainSummary("vrm", shared),
		getChainSummary("vrc", shared)
	]);

	return {
		vrmSummary,
		vrcSummary,
		vrmRichlist,
		vrcRichlist,
		vrmLeaderboard
	};
}

async function getVrmDashboard(options = {}) {
	const db = options.db || dbModule.openDatabase();
	const shared = Object.assign({}, options, { db });
	const richlist = indexerQuery.getRichlist("vrm", Object.assign({}, shared, { limit: 5 }));
	const leaderboard = indexerQuery.getLeaderboard("vrm", Object.assign({}, shared, {
		period: "month",
		sort: "activity",
		limit: 5
	}));
	const summary = await getChainSummary("vrm", shared);

	return { summary, richlist, leaderboard };
}

async function getIndexerHealth(options = {}) {
	const db = options.db || dbModule.openDatabase();
	const baseHealth = health.getIndexerHealth(Object.assign({}, options, { db }));
	const chains = await Promise.all(baseHealth.chains.map(async chainHealth => {
		try {
			const tip = await liveChain.getTip(chainHealth.id, options);
			return health.enrichWithLiveRpc(chainHealth, tip.height, options);
		} catch (err) {
			return Object.assign({}, chainHealth, {
				explorerStatus: {
					label: "Offline",
					message: "Unable to reach the chain node.",
					syncing: false
				}
			});
		}
	}));

	return Object.assign({}, baseHealth, { chains });
}

async function getBlock(chainId, hashOrHeight, options = {}) {
	const indexed = indexerQuery.getBlock(chainId, hashOrHeight, options);

	if (indexed.found) {
		return indexed;
	}

	try {
		return await liveChain.getBlockFromRpc(chainId, hashOrHeight, options);
	} catch (err) {
		return indexed;
	}
}

module.exports = {
	getChainSummary,
	getIndexerHealth,
	getBlock,
	getLandingData,
	getVrmDashboard
};
