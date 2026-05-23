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

function closeDatabase() {
	if (!db) {
		return;
	}

	db.close();
	db = null;
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
	getStatus
};
