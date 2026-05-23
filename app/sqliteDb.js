"use strict";

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const debug = require("debug");
const debugLog = debug("btcexp:sqlite");

const config = require("./config.js");
const utils = require("./utils.js");

let db = null;

function getDatabase() {
	if (!config.sqliteEnabled) {
		return null;
	}

	if (db) {
		return db;
	}

	try {
		// Ensure database directory exists
		const dbDir = path.dirname(config.sqlitePath);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
			debugLog(`Created database directory: ${dbDir}`);
		}

		// Open database connection
		db = new Database(config.sqlitePath);
		
		// Enable WAL mode for better concurrency
		db.pragma("journal_mode = WAL");
		
		// Enable foreign keys
		db.pragma("foreign_keys = ON");
		
		// Set busy timeout
		db.pragma("busy_timeout = 5000");

		debugLog(`SQLite database opened: ${config.sqlitePath}`);
		
		// Create tables if they don't exist
		createTables();
		
		return db;
	} catch (err) {
		utils.logError("sqlite-db-connection", err, {path: config.sqlitePath});
		return null;
	}
}

function createTables() {
	if (!db) {
		return;
	}

	const createBlocksTable = `
		CREATE TABLE IF NOT EXISTS blocks (
			height INTEGER PRIMARY KEY,
			hash TEXT UNIQUE NOT NULL,
			time INTEGER NOT NULL,
			size INTEGER,
			weight INTEGER,
			tx_count INTEGER,
			difficulty REAL,
			chainwork TEXT,
			merkle_root TEXT,
			version INTEGER,
			bits TEXT,
			nonce INTEGER,
			previous_block_hash TEXT,
			next_block_hash TEXT,
			is_orphan BOOLEAN DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`;

	const createTransactionsTable = `
		CREATE TABLE IF NOT EXISTS transactions (
			txid TEXT PRIMARY KEY,
			block_height INTEGER,
			block_hash TEXT,
			time INTEGER,
			size INTEGER,
			vsize INTEGER,
			weight INTEGER,
			fee REAL,
			is_coinbase BOOLEAN DEFAULT 0,
			vin_count INTEGER,
			vout_count INTEGER,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (block_height) REFERENCES blocks(height) ON DELETE CASCADE
		);
	`;

	const createAddressTxsTable = `
		CREATE TABLE IF NOT EXISTS address_txs (
			address TEXT NOT NULL,
			txid TEXT NOT NULL,
			block_height INTEGER,
			is_input BOOLEAN DEFAULT 0,
			is_output BOOLEAN DEFAULT 0,
			value REAL,
			vout_index INTEGER,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (address, txid, vout_index),
			FOREIGN KEY (txid) REFERENCES transactions(txid) ON DELETE CASCADE,
			FOREIGN KEY (block_height) REFERENCES blocks(height) ON DELETE CASCADE
		);
	`;

	const createAddressBalancesTable = `
		CREATE TABLE IF NOT EXISTS address_balances (
			address TEXT PRIMARY KEY,
			balance REAL NOT NULL DEFAULT 0,
			tx_count INTEGER NOT NULL DEFAULT 0,
			last_seen_height INTEGER,
			updated_at INTEGER NOT NULL
		);
	`;

	const createOrphanedBlocksTable = `
		CREATE TABLE IF NOT EXISTS orphaned_blocks (
			hash TEXT PRIMARY KEY,
			height INTEGER,
			previous_hash TEXT,
			time INTEGER,
			reason TEXT,
			discovered_at INTEGER NOT NULL
		);
	`;

	const createSyncMetadataTable = `
		CREATE TABLE IF NOT EXISTS sync_metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`;

	// Create indexes for performance
	const createIndexes = `
		CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);
		CREATE INDEX IF NOT EXISTS idx_blocks_time ON blocks(time);
		CREATE INDEX IF NOT EXISTS idx_blocks_orphan ON blocks(is_orphan);
		
		CREATE INDEX IF NOT EXISTS idx_txs_block_height ON transactions(block_height);
		CREATE INDEX IF NOT EXISTS idx_txs_block_hash ON transactions(block_hash);
		CREATE INDEX IF NOT EXISTS idx_txs_time ON transactions(time);
		
		CREATE INDEX IF NOT EXISTS idx_address_txs_address ON address_txs(address);
		CREATE INDEX IF NOT EXISTS idx_address_txs_txid ON address_txs(txid);
		CREATE INDEX IF NOT EXISTS idx_address_txs_height ON address_txs(block_height);
		CREATE INDEX IF NOT EXISTS idx_address_txs_address_height ON address_txs(address, block_height);
		
		CREATE INDEX IF NOT EXISTS idx_address_balances_balance ON address_balances(balance DESC);
		
		CREATE INDEX IF NOT EXISTS idx_orphaned_blocks_height ON orphaned_blocks(height);
		CREATE INDEX IF NOT EXISTS idx_orphaned_blocks_discovered ON orphaned_blocks(discovered_at DESC);
	`;

	try {
		db.exec(createBlocksTable);
		db.exec(createTransactionsTable);
		db.exec(createAddressTxsTable);
		db.exec(createAddressBalancesTable);
		db.exec(createOrphanedBlocksTable);
		db.exec(createSyncMetadataTable);
		db.exec(createIndexes);
		
		debugLog("SQLite tables and indexes created successfully");
	} catch (err) {
		utils.logError("sqlite-create-tables", err);
		throw err;
	}
}

function closeDatabase() {
	if (db) {
		try {
			db.close();
			db = null;
			debugLog("SQLite database closed");
		} catch (err) {
			utils.logError("sqlite-close", err);
		}
	}
}

// Test function for Phase 1
function test() {
	console.log("=== SQLite Database Test ===");
	
	if (!config.sqliteEnabled) {
		console.log("❌ SQLite is not enabled (BTCEXP_USE_SQLITE not set to true)");
		return false;
	}
	
	try {
		const testDb = getDatabase();
		if (!testDb) {
			console.log("❌ Failed to open database");
			return false;
		}
		
		console.log("✅ Database connection successful");
		console.log(`   Path: ${config.sqlitePath}`);
		
		// Test table existence
		const tables = testDb.prepare(`
			SELECT name FROM sqlite_master 
			WHERE type='table' 
			ORDER BY name
		`).all();
		
		console.log(`✅ Found ${tables.length} tables:`);
		tables.forEach(table => {
			console.log(`   - ${table.name}`);
		});
		
		// Test insert and query
		const now = Date.now();
		const testKey = `test-${now}`;
		const testValue = `test-value-${now}`;
		
		// Insert test metadata
		const insertStmt = testDb.prepare(`
			INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
			VALUES (?, ?, ?)
		`);
		insertStmt.run(testKey, testValue, now);
		console.log("✅ Test insert successful");
		
		// Query test metadata
		const selectStmt = testDb.prepare(`
			SELECT value FROM sync_metadata WHERE key = ?
		`);
		const result = selectStmt.get(testKey);
		
		if (result && result.value === testValue) {
			console.log("✅ Test query successful");
			console.log(`   Retrieved: ${result.value}`);
		} else {
			console.log("❌ Test query failed");
			return false;
		}
		
		// Clean up test data
		const deleteStmt = testDb.prepare(`DELETE FROM sync_metadata WHERE key = ?`);
		deleteStmt.run(testKey);
		console.log("✅ Test cleanup successful");
		
		// Get database file size
		if (fs.existsSync(config.sqlitePath)) {
			const stats = fs.statSync(config.sqlitePath);
			const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
			console.log(`✅ Database file size: ${sizeMB} MB`);
		}
		
		console.log("\n=== All Tests Passed ===");
		return true;
		
	} catch (err) {
		console.log(`❌ Test failed: ${err.message}`);
		console.error(err);
		return false;
	}
}

module.exports = {
	getDatabase: getDatabase,
	closeDatabase: closeDatabase,
	active: config.sqliteEnabled,
	test: test
};

