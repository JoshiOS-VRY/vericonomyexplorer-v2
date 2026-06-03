"use strict";

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const debug = require("debug");

const schema = require("./schema.js");

const debugLog = debug("btcexp:indexer-v2-db");

let db = null;

function getBackend() {
	return String(process.env.VCEXP_DB_BACKEND || "sqlite").toLowerCase() === "postgres"
		? "postgres"
		: "sqlite";
}

// Augment a better-sqlite3 instance with the unified async-compatible interface
// (get/all/run/runTransaction) used by the ported query/ingest code. Methods
// return values synchronously, so `await db.get(...)` resolves immediately and
// existing `db.prepare(sql).get(...)` call sites keep working unchanged.
function augmentSqlite(target) {
	if (target.__unified) {
		return target;
	}

	const stmtCache = new Map();
	const prepareCached = (sql) => {
		let stmt = stmtCache.get(sql);
		if (!stmt) {
			stmt = target.prepare(sql);
			stmtCache.set(sql, stmt);
		}
		return stmt;
	};
	const toArgs = (params) => {
		if (params === undefined) return [];
		return Array.isArray(params) ? params : [params];
	};

	target.backend = "sqlite";
	target.get = (sql, params) => prepareCached(sql).get(...toArgs(params));
	target.all = (sql, params) => prepareCached(sql).all(...toArgs(params));
	target.run = (sql, params) => prepareCached(sql).run(...toArgs(params));
	target.runTransaction = (fn) => {
		target.exec("BEGIN");
		try {
			const value = fn(target);
			const settle = (resolved) => {
				target.exec("COMMIT");
				return resolved;
			};
			if (value && typeof value.then === "function") {
				return value.then(settle, (err) => {
					try {
						target.exec("ROLLBACK");
					} catch {
						/* ignore */
					}
					throw err;
				});
			}
			return settle(value);
		} catch (err) {
			try {
				target.exec("ROLLBACK");
			} catch {
				/* ignore */
			}
			throw err;
		}
	};

	Object.defineProperty(target, "__unified", { value: true, enumerable: false });
	return target;
}

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

function openDatabase(dbPath = getDatabasePath(), options = {}) {
	if (getBackend() === "postgres") {
		return require("./pgClient.js").openPostgres();
	}

	if (db) {
		return db;
	}

	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	// Heavy schema backfills run once under a file lock, not on every connection open.
	if (options.skipMigrations !== true) {
		ensureDatabaseMigrations(dbPath);
	}

	db = new Database(dbPath);
	db.defaultSafeIntegers(true);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	const busyTimeoutMs = Number(options.busyTimeoutMs ?? process.env.VCEXP_INDEXER_BUSY_TIMEOUT_MS ?? 30_000);
	db.pragma(`busy_timeout = ${Number.isFinite(busyTimeoutMs) && busyTimeoutMs > 0 ? busyTimeoutMs : 30_000}`);
	db.pragma("synchronous = NORMAL");
	const walAutocheckpoint = Number(process.env.VCEXP_SQLITE_WAL_AUTOCHECKPOINT ?? 1000);
	if (Number.isFinite(walAutocheckpoint) && walAutocheckpoint > 0) {
		db.pragma(`wal_autocheckpoint = ${Math.trunc(walAutocheckpoint)}`);
	}

	schema.applySchema(db, Object.assign({}, options, { skipHeavyBackfills: true }));
	if (options.skipSeed !== true) {
		seedChains(db);
	}

	augmentSqlite(db);
	debugLog(`Indexer V2 database opened: ${dbPath}`);

	return db;
}

function openDatabaseReadOnly(dbPath = getDatabasePath()) {
	if (getBackend() === "postgres") {
		return require("./pgClient.js").openPostgres();
	}

	const readonlyDb = new Database(dbPath, { readonly: true });
	readonlyDb.defaultSafeIntegers(true);
	readonlyDb.pragma("foreign_keys = ON");
	applyReadPragmas(readonlyDb);
	augmentSqlite(readonlyDb);
	return readonlyDb;
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
	const mode = force ? "TRUNCATE" : String(process.env.VCEXP_WAL_CHECKPOINT_MODE ?? "PASSIVE").toUpperCase();
	const checkpointMode = ["PASSIVE", "FULL", "RESTART", "TRUNCATE"].includes(mode) ? mode : "PASSIVE";
	activeDb.pragma(`wal_checkpoint(${checkpointMode})`);
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

function sleepMs(ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		/* busy-wait for short migration lock delays */
	}
}

function isSchemaCurrent(dbPath) {
	if (!fs.existsSync(dbPath)) {
		return false;
	}

	let checkDb = null;
	try {
		checkDb = new Database(dbPath, { readonly: true });
		checkDb.pragma("busy_timeout = 5000");
		const stored = schema.getStoredSchemaVersion(checkDb);
		return stored >= schema.schemaVersion;
	} catch {
		return false;
	} finally {
		if (checkDb) {
			checkDb.close();
		}
	}
}

function isStaleMigrationLock(lockPath, maxAgeMs = 2 * 60 * 1000) {
	try {
		const stat = fs.statSync(lockPath);
		return Date.now() - stat.mtimeMs > maxAgeMs;
	} catch {
		return false;
	}
}

function acquireMigrationLock(lockPath, maxWaitMs = 600_000) {
	const start = Date.now();

	while (Date.now() - start < maxWaitMs) {
		try {
			return fs.openSync(lockPath, "wx");
		} catch (err) {
			if (err && err.code !== "EEXIST") {
				throw err;
			}

			if (isSchemaCurrent(getDatabasePath())) {
				return null;
			}

			if (isStaleMigrationLock(lockPath)) {
				try {
					fs.unlinkSync(lockPath);
				} catch {
					/* ignore stale lock cleanup failures */
				}
				continue;
			}

			sleepMs(2000);
		}
	}

	throw new Error(`Timed out waiting for migration lock: ${lockPath}`);
}

function releaseMigrationLock(lockPath, lockFd) {
	if (lockFd == null) {
		return;
	}

	fs.closeSync(lockFd);
	try {
		fs.unlinkSync(lockPath);
	} catch {
		/* ignore stale lock cleanup failures */
	}
}

function ensureDatabaseMigrations(dbPath = getDatabasePath()) {
	if (isSchemaCurrent(dbPath)) {
		return {
			ran: false,
			reason: "already-current",
		};
	}

	const lockPath = `${dbPath}.migrate.lock`;
	process.stderr.write(`[indexer-migrate] waiting for migration lock ${lockPath}\n`);
	const lockFd = acquireMigrationLock(lockPath);

	try {
		if (isSchemaCurrent(dbPath)) {
			return {
				ran: false,
				reason: "already-current",
			};
		}

		process.stderr.write(`[indexer-migrate] acquired lock; applying migrations\n`);

		const migrationDb = new Database(dbPath);
		migrationDb.defaultSafeIntegers(true);
		migrationDb.pragma("foreign_keys = ON");
		migrationDb.pragma("busy_timeout = 60000");
		migrationDb.exec(schema.getSchemaSql());
		schema.applyMigrations(migrationDb);
		schema.setStoredSchemaVersion(migrationDb, schema.schemaVersion);
		migrationDb.close();

		debugLog(`Indexer V2 migrations applied: ${dbPath}`);

		return {
			ran: true,
		};
	} finally {
		releaseMigrationLock(lockPath, lockFd);
	}
}

function getStatus() {
	const health = require("./health.js");

	return Object.assign({
		schemaVersion: schema.schemaVersion
	}, health.getIndexerHealth());
}

module.exports = {
	openDatabase,
	openDatabaseReadOnly,
	closeDatabase,
	getDatabasePath,
	getBackend,
	augmentSqlite,
	applyReadPragmas,
	ensureDatabaseMigrations,
	getWalSizeMb,
	maybeCheckpointWal,
	getStatus
};
