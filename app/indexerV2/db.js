"use strict";

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const debug = require("debug");

const schema = require("./schema.js");

const debugLog = debug("btcexp:indexer-v2-db");

let db = null;

function getDefaultPath() {
	return path.join(process.cwd(), "database", "vericonomy-index.sqlite");
}

function getDatabasePath() {
	return process.env.VCEXP_INDEXER_SQLITE_PATH || process.env.BTCEXP_INDEXER_SQLITE_PATH || getDefaultPath();
}

function applyReadPragmas(targetDb) {
	const cacheMb = Number(process.env.VCEXP_SQLITE_CACHE_MB ?? 256);
	if (Number.isFinite(cacheMb) && cacheMb > 0) {
		targetDb.pragma(`cache_size = -${Math.round(cacheMb * 1024)}`);
	}

	const mmapMb = Number(process.env.VCEXP_SQLITE_MMAP_MB ?? 256);
	if (Number.isFinite(mmapMb) && mmapMb > 0) {
		targetDb.pragma(`mmap_size = ${Math.round(mmapMb * 1024 * 1024)}`);
	}

	targetDb.pragma("temp_store = MEMORY");
	targetDb.pragma("busy_timeout = 10000");
}

function openDatabase(dbPath = getDatabasePath()) {
	if (db) {
		return db;
	}

	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	db = new Database(dbPath);
	db.defaultSafeIntegers(true);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	db.pragma("busy_timeout = 10000");
	db.pragma("synchronous = NORMAL");

	schema.applySchema(db);
	seedChains(db);

	debugLog(`Indexer V2 database opened: ${dbPath}`);

	return db;
}

function seedChains(targetDb) {
	const now = Date.now();
	const insertChain = targetDb.prepare(`
		INSERT INTO chains (
			id, ticker, name, network, consensus, rpc_capabilities_json, created_at, updated_at
		) VALUES (
			@id, @ticker, @name, @network, @consensus, @rpc_capabilities_json, @created_at, @updated_at
		)
		ON CONFLICT(id) DO UPDATE SET
			ticker = excluded.ticker,
			name = excluded.name,
			network = excluded.network,
			consensus = excluded.consensus,
			updated_at = excluded.updated_at
	`);

	insertChain.run({
		id: "vrc",
		ticker: "VRC",
		name: "VeriCoin",
		network: "main",
		consensus: "PoST",
		rpc_capabilities_json: JSON.stringify({
			txLookup: "rpc-or-index",
			addressBalances: "index",
			staking: true
		}),
		created_at: now,
		updated_at: now
	});

	insertChain.run({
		id: "vrm",
		ticker: "VRM",
		name: "Verium",
		network: "main",
		consensus: "PoWT",
		rpc_capabilities_json: JSON.stringify({
			txLookup: "index-first",
			addressBalances: "index",
			arbitraryTxQuery: false
		}),
		created_at: now,
		updated_at: now
	});
}

function getWalPath(dbPath = getDatabasePath()) {
	return `${dbPath}-wal`;
}

function getWalSizeMb(dbPath = getDatabasePath()) {
	const walPath = getWalPath(dbPath);
	if (!fs.existsSync(walPath)) {
		return 0;
	}

	return fs.statSync(walPath).size / (1024 * 1024);
}

function maybeCheckpointWal(targetDb = db, options = {}) {
	const activeDb = targetDb || db;
	if (!activeDb) {
		return {
			ran: false,
			reason: "database-not-open"
		};
	}

	const thresholdMb = options.thresholdMb === undefined
		? Number(process.env.VCEXP_WAL_CHECKPOINT_MB ?? 512)
		: Number(options.thresholdMb);
	const force = options.force === true;
	const dbPath = getDatabasePath();
	const walSizeMb = getWalSizeMb(dbPath);

	if (!force && walSizeMb < thresholdMb) {
		return {
			ran: false,
			reason: "below-threshold",
			walSizeMb,
			thresholdMb
		};
	}

	const beforeMb = walSizeMb;
	activeDb.pragma("wal_checkpoint(TRUNCATE)");
	const afterMb = getWalSizeMb(dbPath);

	debugLog(`WAL checkpoint complete: ${beforeMb.toFixed(1)}MB -> ${afterMb.toFixed(1)}MB`);

	return {
		ran: true,
		walSizeMbBefore: beforeMb,
		walSizeMbAfter: afterMb,
		thresholdMb
	};
}

function closeDatabase() {
	if (!db) {
		return;
	}

	db.close();
	db = null;
}

function ensureDatabaseMigrations(dbPath = getDatabasePath()) {
	const migrationDb = new Database(dbPath);
	migrationDb.defaultSafeIntegers(true);
	migrationDb.pragma("foreign_keys = ON");
	migrationDb.pragma("busy_timeout = 10000");
	schema.applyMigrations(migrationDb);
	migrationDb.close();
}

function getStatus() {
	const health = require("./health.js");

	return Object.assign({
		schemaVersion: schema.schemaVersion
	}, health.getIndexerHealth());
}

module.exports = {
	openDatabase,
	closeDatabase,
	getDatabasePath,
	applyReadPragmas,
	ensureDatabaseMigrations,
	getWalSizeMb,
	maybeCheckpointWal,
	getStatus
};
