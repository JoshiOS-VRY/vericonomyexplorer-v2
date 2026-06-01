"use strict";

const express = require("express");
const asyncHandler = require("express-async-handler");

const indexerQuery = require("./../app/indexerV2/query.js");
const indexerHealth = require("./../app/indexerV2/health.js");
const chainMeta = require("./../app/indexerV2/chainMeta.js");
const tipSync = require("./../app/indexerV2/tipSync.js");
const utils = require("./../app/utils.js");

const router = express.Router();

router.get("/", asyncHandler(async (req, res, next) => {
	await renderLandingPage(req, res, next);
}));

router.get(["/vrm", "/verium"], asyncHandler(async (req, res, next) => {
	await renderChainPage(req, res, next, "vrm");
}));

router.get(["/vrc", "/vericoin"], asyncHandler(async (req, res, next) => {
	await renderChainPage(req, res, next, "vrc");
}));

router.get("/vrm/richlist", asyncHandler(async (req, res, next) => {
	await renderRichlistPage(req, res, next, "vrm");
}));

router.get("/vrc/richlist", asyncHandler(async (req, res, next) => {
	await renderRichlistPage(req, res, next, "vrc");
}));

router.get("/vrm/leaderboard", asyncHandler(async (req, res, next) => {
	await renderLeaderboardPage(req, res, next, "vrm");
}));

router.get("/vrc/leaderboard", asyncHandler(async (req, res, next) => {
	await renderLeaderboardPage(req, res, next, "vrc");
}));

router.get("/vrm/address/:address", asyncHandler(async (req, res, next) => {
	await renderAddressPage(req, res, next, "vrm", req.params.address);
}));

router.get("/vrc/address/:address", asyncHandler(async (req, res, next) => {
	await renderAddressPage(req, res, next, "vrc", req.params.address);
}));

router.get("/vrm/tx/:txid", asyncHandler(async (req, res, next) => {
	await renderTransactionPage(req, res, next, "vrm", req.params.txid);
}));

router.get("/vrc/tx/:txid", asyncHandler(async (req, res, next) => {
	await renderTransactionPage(req, res, next, "vrc", req.params.txid);
}));

router.get("/vrm/block/:hashOrHeight", asyncHandler(async (req, res, next) => {
	await renderBlockPage(req, res, next, "vrm", req.params.hashOrHeight);
}));

router.get("/vrc/block/:hashOrHeight", asyncHandler(async (req, res, next) => {
	await renderBlockPage(req, res, next, "vrc", req.params.hashOrHeight);
}));

router.post("/vrm/search", function(req, res, next) {
	handleSearch(req, res, "vrm");
});

router.post("/vrc/search", function(req, res, next) {
	handleSearch(req, res, "vrc");
});

function handleSearch(req, res, chainId) {
	const meta = chainMeta.getChainMeta(chainId);
	const query = String(req.body.query || "").trim();
	const basePath = chainMeta.getChainBasePath(chainId);

	if (!query) {
		req.session.userMessage = `Enter a ${meta.ticker} block height, block hash, txid, or address.`;
		res.redirect(basePath);
		return;
	}

	try {
		if (/^\d+$/.test(query)) {
			res.redirect(`${basePath}/block/${query}`);
			return;
		}

		if (/^[a-fA-F0-9]{64}$/.test(query)) {
			const tx = indexerQuery.getTransaction(chainId, query);
			if (tx.found) {
				res.redirect(`${basePath}/tx/${query}`);
				return;
			}

			res.redirect(`${basePath}/block/${query}`);
			return;
		}

		const address = indexerQuery.getAddress(chainId, query, { limit: 1 });
		if (address.found) {
			res.redirect(`${basePath}/address/${query}`);
			return;
		}

		req.session.userMessage = `No indexed ${meta.ticker} result found for query: ${query}`;
		res.redirect(basePath);

	} catch (err) {
		utils.logError(`${chainId}-index-search`, err);
		req.session.userMessage = "Search failed: " + (err.message || err);
		return res.redirect(basePath);
	}
}

async function renderLandingPage(req, res) {
	try {
		await Promise.all([
			tipSync.syncToTip("vrm", { pageType: "landing" }),
			tipSync.syncToTip("vrc", { pageType: "landing" })
		]);

		const vrmSummary = indexerQuery.getChainSummary("vrm", { liteHealth: true, blockLimit: 8 });
		const vrcSummary = indexerQuery.getChainSummary("vrc", { liteHealth: true, blockLimit: 8 });
		const vrmRichlist = vrmSummary.health.trusted
			? indexerQuery.getRichlist("vrm", { limit: 5 })
			: indexerQuery.getRichlist("vrm", { limit: 5, allowUntrusted: true });

		res.locals.metaTitle = "VeriConomy Explorer";
		res.locals.indexerPage = true;
		res.locals.landing = {
			health: indexerHealth.getIndexerHealth(),
			vrmSummary,
			vrcSummary,
			vrmRichlist,
			vrmLeaderboard: null
		};

		if (vrmSummary.health.trusted && (vrmSummary.health.heights.blocksBehind || 0) === 0) {
			res.locals.landing.vrmLeaderboard = indexerQuery.getLeaderboard("vrm", {
				period: "month",
				sort: "activity",
				limit: 5
			});
		}

		return res.render("indexer/landing");

	} catch (err) {
		return renderIndexerError(res, err, "VeriConomy Explorer");
	}
}

async function renderChainPage(req, res, next, chainId) {
	try {
		const meta = chainMeta.getChainMeta(chainId);
		const syncResult = await tipSync.syncToTip(chainId, { pageType: "chain" });

		res.locals.metaTitle = meta.pageTitle;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.tipSync = syncResult;
		res.locals.summary = indexerQuery.getChainSummary(chainId, {
			liteHealth: true,
			blockLimit: 12,
			txLimit: 20
		});
		res.locals.richlist = indexerQuery.getRichlist(chainId, { limit: 5, allowUntrusted: true });

		const blocksBehind = res.locals.summary.health.heights.blocksBehind || 0;
		res.locals.leaderboard = blocksBehind === 0 && res.locals.summary.health.trusted
			? indexerQuery.getLeaderboard(chainId, {
				period: "month",
				sort: "activity",
				limit: 5
			})
			: {
				enabled: false,
				message: blocksBehind > 0
					? "Leaderboard loads after the index catches up to the chain tip."
					: "Leaderboard is available once this chain index is trusted."
			};

		return res.render("indexer/chain");

	} catch (err) {
		return renderIndexerError(res, err, chainMeta.getChainMeta(chainId).pageTitle);
	}
}

async function renderRichlistPage(req, res, next, chainId) {
	try {
		await tipSync.syncToTip(chainId, { pageType: "chain" });

		const meta = chainMeta.getChainMeta(chainId);
		const limit = normalizeLimit(req.query.limit, 50);
		const offset = normalizeOffset(req.query.offset);

		res.locals.metaTitle = `${meta.name} Richlist`;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.limit = limit;
		res.locals.offset = offset;
		res.locals.richlist = indexerQuery.getRichlist(chainId, { limit, offset });
		return res.render("indexer/richlist");

	} catch (err) {
		return renderIndexerError(res, err, `${chainMeta.getChainMeta(chainId).name} Richlist`);
	}
}

async function renderLeaderboardPage(req, res, next, chainId) {
	try {
		await tipSync.syncToTip(chainId, { pageType: "chain" });

		const meta = chainMeta.getChainMeta(chainId);
		const limit = normalizeLimit(req.query.limit, 50);
		const offset = normalizeOffset(req.query.offset);
		const period = req.query.period || "week";
		const sort = req.query.sort || "net";

		res.locals.metaTitle = `${meta.name} Leaderboard`;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.limit = limit;
		res.locals.offset = offset;
		res.locals.period = period;
		res.locals.sort = sort;
		res.locals.leaderboard = indexerQuery.getLeaderboard(chainId, {
			period,
			sort,
			limit,
			offset
		});
		return res.render("indexer/leaderboard");

	} catch (err) {
		return renderIndexerError(res, err, `${chainMeta.getChainMeta(chainId).name} Leaderboard`);
	}
}

async function renderAddressPage(req, res, next, chainId, address) {
	try {
		const meta = chainMeta.getChainMeta(chainId);
		const syncResult = await tipSync.syncToTip(chainId, { pageType: "address" });
		const limit = normalizeLimit(req.query.limit, 25);
		const offset = normalizeOffset(req.query.offset);

		res.locals.metaTitle = `${meta.name} Address ${address}`;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.tipSync = syncResult;
		res.locals.limit = limit;
		res.locals.offset = offset;
		res.locals.addressResult = indexerQuery.getAddress(chainId, address, { limit, offset });
		return res.render("indexer/address");

	} catch (err) {
		return renderIndexerError(res, err, `${chainMeta.getChainMeta(chainId).name} Address`);
	}
}

async function renderTransactionPage(req, res, next, chainId, txid) {
	try {
		await tipSync.syncToTip(chainId, { pageType: "chain" });

		const meta = chainMeta.getChainMeta(chainId);

		res.locals.metaTitle = `${meta.name} Transaction ${utils.ellipsizeMiddle(txid, 16)}`;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.txResult = indexerQuery.getTransaction(chainId, txid);
		return res.render("indexer/transaction");

	} catch (err) {
		return renderIndexerError(res, err, `${chainMeta.getChainMeta(chainId).name} Transaction`);
	}
}

async function renderBlockPage(req, res, next, chainId, hashOrHeight) {
	try {
		await tipSync.syncToTip(chainId, { pageType: "chain" });

		const meta = chainMeta.getChainMeta(chainId);
		const limit = normalizeLimit(req.query.limit, 50);
		const offset = normalizeOffset(req.query.offset);

		res.locals.metaTitle = `${meta.name} Block ${hashOrHeight}`;
		res.locals.indexerPage = true;
		res.locals.chainMeta = meta;
		res.locals.chainBasePath = chainMeta.getChainBasePath(chainId);
		res.locals.limit = limit;
		res.locals.offset = offset;
		res.locals.blockResult = indexerQuery.getBlock(chainId, hashOrHeight, { limit, offset });
		return res.render("indexer/block");

	} catch (err) {
		return renderIndexerError(res, err, `${chainMeta.getChainMeta(chainId).name} Block`);
	}
}

function renderIndexerError(res, err, title) {
	utils.logError("indexer-page", err);
	res.locals.metaTitle = title;
	res.locals.indexerPage = true;
	res.locals.indexerError = err.message || String(err);
	return res.render("indexer/error");
}

function normalizeLimit(value, defaultValue) {
	const limit = Number(value || defaultValue);

	if (!Number.isFinite(limit) || limit < 1) {
		return defaultValue;
	}

	return Math.min(Math.floor(limit), 100);
}

function normalizeOffset(value) {
	const offset = Number(value || 0);

	if (!Number.isFinite(offset) || offset < 0) {
		return 0;
	}

	return Math.floor(offset);
}

module.exports = router;
