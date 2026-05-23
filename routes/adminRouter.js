"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const fs = require('fs');
const v8 = require('v8');

const express = require('express');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const sha256 = require("crypto-js/sha256");
const hexEnc = require("crypto-js/enc-hex");
const Decimal = require("decimal.js");


const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");


const statTracker = require("./../app/statTracker.js");
const appStats = require("./../app/appStats.js");
const sqliteDb = require("./../app/sqliteDb.js");
const sqliteSync = require("./../app/sqliteSync.js");

// Admin authentication middleware - restrict to localhost only
const adminAuth = require("./../app/adminAuth.js");
router.use(adminAuth);

router.get("/dashboard", function(req, res, next) {
	res.locals.appStartTime = global.appStartTime;
	res.locals.memstats = v8.getHeapStatistics();
	res.locals.rpcStats = global.rpcStats;
	res.locals.electrumStats = global.electrumStats;
	res.locals.cacheStats = global.cacheStats;
	res.locals.errorStats = global.errorStats;
	res.locals.appEventStats = global.appEventStats;

	res.locals.cacheSizes = {
		misc: {
			size: global.miscLruCache.size,
			itemCount: global.miscLruCache.itemCount
		},
		block: {
			size: global.blockLruCache.size,
			itemCount: global.blockLruCache.itemCount
		},
		tx: {
			size: global.txLruCache.size,
			itemCount: global.txLruCache.itemCount
		},
		mining: {
			size: global.miningSummaryLruCache.size,
			itemCount: global.miningSummaryLruCache.itemCount
		}
	};

	res.locals.appConfig = {
		privacyMode: config.privacyMode,
		slowDeviceMode: config.slowDeviceMode,
		demoSite: config.demoSite,
		rpcConcurrency: config.rpcConcurrency,
		addressApi: config.addressApi,
		ipStackComApiAccessKey: !!config.credentials.ipStackComApiAccessKey,
		mapBoxComApiAccessKey: !!config.credentials.mapBoxComApiAccessKey,
		redisCache: !!config.redisUrl,
		noInmemoryRpcCache: config.noInmemoryRpcCache
	};

	res.render("admin/dashboard");

	next();
});

router.get("/os-stats", function(req, res, next) {
	res.locals.appStats = appStats.getAllAppStats();
	res.locals.appStatNames = appStats.statNames;
	

	res.render("admin/os-stats");

	next();
});

router.get("/perf-log", function(req, res, next) {
	res.locals.perfLog = utils.perfLog;

	res.render("admin/perf-log");

	next();
});


router.get("/app-stats", function(req, res, next) {
	res.locals.stats = statTracker.currentStats();
	
	
	res.locals.performanceStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.performance)) {
		res.locals.performanceStats.push([key, value]);
	}

	res.locals.performanceStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});


	res.locals.eventStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.event)) {
		res.locals.eventStats.push([key, value]);
	}

	res.locals.eventStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});


	res.locals.valueStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.value)) {
		res.locals.valueStats.push([key, value]);
	}

	res.locals.valueStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});
	

	res.render("admin/app-stats");

	next();
});


router.get('/resetUserSettings', (req, res) => {
	req.session.userSettings = Object.create(null);
 
	let userSettings = Object.create(null);
	
	res.cookie("user-settings", JSON.stringify(userSettings));

	res.redirect(req.headers.referer);
});


router.get('/heapdump', (req, res) => {
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	debugLog(`Heap dump requested by IP ${ip}...`);

	if (ip == "127.0.0.1") {
		const filename = `./heapDump-${Date.now()}.heapsnapshot`;
		const heapdumpStream = v8.getHeapSnapshot();
		const fileStream = fs.createWriteStream(filename);
		heapdumpStream.pipe(fileStream);
		
		debugLog("Heap dump at startup written to", filename);

		res.status(200).send({msg: "successfully took a heap dump"});
	}
});


router.get("/node-details", async function(req, res, next) {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"node-details"});
		res.locals.perfId = perfId;

		const promises = [];

		promises.push(utils.timePromise("node-details.getBlockchainInfo", async () => {
			res.locals.getblockchaininfo = await coreApi.getBlockchainInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getDeploymentInfo", async () => {
			res.locals.getdeploymentinfo = await coreApi.getDeploymentInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getNetworkInfo", async () => {
			res.locals.getnetworkinfo = await coreApi.getNetworkInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getUptimeSeconds", async () => {
			res.locals.uptimeSeconds = await coreApi.getUptimeSeconds();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getNetTotals", async () => {
			res.locals.getnettotals = await coreApi.getNetTotals();
		}, perfResults));

		await utils.awaitPromises(promises);

		res.locals.perfResults = perfResults;

		await utils.timePromise("node-details.render", async () => {
			res.render("admin/node-details");
		}, perfResults);

		next();
	} catch (err) {
		utils.logError("admin-node-details", err);
		res.locals.userMessage = "Error building page: " + err;
		await utils.timePromise("node-details.render", async () => {
			res.render("admin/node-details");
		});
		next();
	}
});

router.get("/database-status", async function(req, res, next) {
	try {
		if (!config.sqliteEnabled) {
			res.locals.databaseStatus = {
				enabled: false,
				message: "SQLite is not enabled"
			};
			res.render("admin/database-status");
			next();
			return;
		}

		const db = sqliteDb.getDatabase();
		if (!db) {
			res.locals.databaseStatus = {
				enabled: true,
				available: false,
				message: "Database not available"
			};
			res.render("admin/database-status");
			next();
			return;
		}

		// Get blockchain info
		let currentHeight = null;
		try {
			const blockchainInfo = await coreApi.getBlockchainInfo();
			currentHeight = blockchainInfo.blocks;
		} catch (err) {
			// RPC may not be available, continue without it
		}

		// Get sync status
		const lastSynced = sqliteSync.getLastSyncedHeight();
		const backfillStatus = sqliteSync.getBackfillStatus();

		// Database stats
		const blockCount = db.prepare('SELECT COUNT(*) as count FROM blocks;').get();
		const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions;').get();
		const addrTxCount = db.prepare('SELECT COUNT(*) as count FROM address_txs;').get();
		const addrBalCount = db.prepare('SELECT COUNT(*) as count FROM address_balances;').get();

		// Get height range
		const heightRange = db.prepare('SELECT MIN(height) as min_height, MAX(height) as max_height FROM blocks;').get();

		// Check sync metadata
		const syncMeta = db.prepare('SELECT key, value, updated_at FROM sync_metadata WHERE key = ?;').get('last_synced_height');
		
		// Calculate sync progress
		let syncProgress = null;
		if (currentHeight !== null && lastSynced !== null) {
			const blocksSynced = lastSynced + 1;
			const totalBlocks = currentHeight + 1;
			syncProgress = {
				blocksSynced: blocksSynced,
				totalBlocks: totalBlocks,
				blocksBehind: currentHeight - lastSynced,
				percentComplete: ((blocksSynced / totalBlocks) * 100).toFixed(2)
			};
		}

		// Get database file info
		const fs = require('fs');
		const path = require('path');
		const dbPath = config.sqlitePath;
		let dbFileInfo = null;
		if (fs.existsSync(dbPath)) {
			const stats = fs.statSync(dbPath);
			dbFileInfo = {
				path: dbPath,
				size: stats.size,
				sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
				lastModified: stats.mtime,
				lastModifiedAgo: Math.floor((Date.now() - stats.mtimeMs) / 1000)
			};
		}

		// Last sync activity
		let lastSyncActivity = null;
		if (syncMeta) {
			const syncAge = Math.floor((Date.now() - syncMeta.updated_at) / 1000);
			lastSyncActivity = {
				height: parseInt(syncMeta.value),
				ageSeconds: syncAge,
				ageMinutes: Math.floor(syncAge / 60),
				ageHours: Math.floor(syncAge / 3600),
				isActive: syncAge < 600 // Active if synced within 10 minutes
			};
		}

		res.locals.databaseStatus = {
			enabled: true,
			available: true,
			currentHeight: currentHeight,
			lastSyncedHeight: lastSynced,
			backfillActive: backfillStatus.isBackfilling,
			backfillStartHeight: backfillStatus.backfillStartHeight,
			blockCount: blockCount.count,
			txCount: txCount.count,
			addrTxCount: addrTxCount.count,
			addrBalCount: addrBalCount.count,
			heightRange: heightRange,
			syncProgress: syncProgress,
			dbFileInfo: dbFileInfo,
			lastSyncActivity: lastSyncActivity
		};

		res.render("admin/database-status");
		next();
	} catch (err) {
		utils.logError("admin-database-status", err);
		res.locals.databaseStatus = {
			enabled: config.sqliteEnabled,
			error: err.message
		};
		res.render("admin/database-status");
		next();
	}
});


module.exports = router;
