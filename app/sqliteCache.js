"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:sqlite-cache");

const config = require("./config.js");
const utils = require("./utils.js");
const sqliteDb = require("./sqliteDb.js");

// Cache table name for storing cache entries
const CACHE_TABLE = "cache_entries";

function initializeCacheTable() {
	const db = sqliteDb.getDatabase();
	if (!db) {
		return false;
	}

	try {
		// Create cache table if it doesn't exist
		const createCacheTable = `
			CREATE TABLE IF NOT EXISTS ${CACHE_TABLE} (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				expires_at INTEGER,
				created_at INTEGER NOT NULL
			);
		`;

		const createCacheIndex = `
			CREATE INDEX IF NOT EXISTS idx_cache_expires ON ${CACHE_TABLE}(expires_at);
		`;

		db.exec(createCacheTable);
		db.exec(createCacheIndex);
		
		// Clean up expired entries on initialization
		cleanupExpiredEntries();
		
		return true;
	} catch (err) {
		utils.logError("sqlite-cache-init", err);
		return false;
	}
}

function cleanupExpiredEntries() {
	const db = sqliteDb.getDatabase();
	if (!db) {
		return;
	}

	try {
		const now = Date.now();
		const deleteStmt = db.prepare(`DELETE FROM ${CACHE_TABLE} WHERE expires_at IS NOT NULL AND expires_at < ?`);
		const result = deleteStmt.run(now);
		
		if (result.changes > 0) {
			debugLog(`Cleaned up ${result.changes} expired cache entries`);
		}
	} catch (err) {
		utils.logError("sqlite-cache-cleanup", err);
	}
}

function createCache(keyPrefix, onCacheEvent) {
	if (!sqliteDb.active) {
		return null;
	}

	// Initialize cache table on first use
	if (!initializeCacheTable()) {
		return null;
	}

	return {
		get: async function(key) {
			const db = sqliteDb.getDatabase();
			if (!db) {
				return null;
			}

			const prefixedKey = `${keyPrefix}-${key}`;
			
			onCacheEvent("sqlite", "try", prefixedKey);

			try {
				// Check if entry exists and is not expired
				const now = Date.now();
				const selectStmt = db.prepare(`
					SELECT value, expires_at 
					FROM ${CACHE_TABLE} 
					WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)
				`);
				
				const result = selectStmt.get(prefixedKey, now);

				if (result == null) {
					onCacheEvent("sqlite", "miss", prefixedKey);
					return null;
				}

				// Check if expired (shouldn't happen due to query, but double-check)
				if (result.expires_at && result.expires_at <= now) {
					// Clean up expired entry
					const deleteStmt = db.prepare(`DELETE FROM ${CACHE_TABLE} WHERE key = ?`);
					deleteStmt.run(prefixedKey);
					
					onCacheEvent("sqlite", "miss", prefixedKey);
					return null;
				}

				onCacheEvent("sqlite", "hit", prefixedKey);

				// Parse JSON value
				try {
					return JSON.parse(result.value);
				} catch (parseErr) {
					utils.logError("sqlite-cache-parse", parseErr, {key: prefixedKey});
					onCacheEvent("sqlite", "error", prefixedKey);
					return null;
				}

			} catch (err) {
				onCacheEvent("sqlite", "error", prefixedKey);
				utils.logError("sqlite-cache-get", err, {key: prefixedKey});
				return null; // Return null on error, don't throw
			}
		},

		set: async function(key, obj, maxAgeMillis) {
			const db = sqliteDb.getDatabase();
			if (!db) {
				return;
			}

			const prefixedKey = `${keyPrefix}-${key}`;
			const now = Date.now();
			
			// Calculate expiration time
			// If maxAgeMillis is 0 or undefined, store without expiration (permanent)
			const expiresAt = (maxAgeMillis && maxAgeMillis > 0) ? (now + maxAgeMillis) : null;

			try {
				const value = JSON.stringify(obj);
				
				const insertStmt = db.prepare(`
					INSERT OR REPLACE INTO ${CACHE_TABLE} (key, value, expires_at, created_at)
					VALUES (?, ?, ?, ?)
				`);
				
				insertStmt.run(prefixedKey, value, expiresAt, now);
				
				onCacheEvent("sqlite", "set", prefixedKey);
				
			} catch (err) {
				onCacheEvent("sqlite", "error", prefixedKey);
				utils.logError("sqlite-cache-set", err, {key: prefixedKey});
				// Don't throw - cache failures shouldn't break the app
			}
		}
	};
}

// Periodic cleanup of expired entries (every 5 minutes)
if (sqliteDb.active) {
	setInterval(() => {
		cleanupExpiredEntries();
	}, 5 * 60 * 1000);
}

// Test function for Phase 2
async function test() {
	console.log("=== SQLite Cache Adapter Test ===");
	
	if (!sqliteDb.active) {
		console.log("❌ SQLite is not enabled (BTCEXP_USE_SQLITE not set to true)");
		return false;
	}
	
	try {
		// Create a test cache instance
		let testEvents = [];
		const onCacheEvent = (type, event, key) => {
			testEvents.push({type, event, key});
		};
		
		const testCache = createCache("test", onCacheEvent);
		
		if (!testCache) {
			console.log("❌ Failed to create cache instance");
			return false;
		}
		
		console.log("✅ Cache instance created");
		
		// Test 1: Set and get without TTL
		const testKey1 = "test-key-1";
		const testValue1 = {data: "test-value-1", timestamp: Date.now()};
		
		await testCache.set(testKey1, testValue1, 0); // No expiration
		console.log("✅ Test set (no TTL) successful");
		
		const result1 = await testCache.get(testKey1);
		if (result1 && result1.data === testValue1.data) {
			console.log("✅ Test get (no TTL) successful");
			console.log(`   Retrieved: ${JSON.stringify(result1)}`);
		} else {
			console.log("❌ Test get (no TTL) failed");
			return false;
		}
		
		// Test 2: Set and get with TTL
		const testKey2 = "test-key-2";
		const testValue2 = {data: "test-value-2", timestamp: Date.now()};
		
		await testCache.set(testKey2, testValue2, 1000); // 1 second TTL
		console.log("✅ Test set (with TTL) successful");
		
		const result2 = await testCache.get(testKey2);
		if (result2 && result2.data === testValue2.data) {
			console.log("✅ Test get (with TTL) successful");
		} else {
			console.log("❌ Test get (with TTL) failed");
			return false;
		}
		
		// Test 3: TTL expiration
		console.log("   Waiting for TTL expiration (1.5 seconds)...");
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		const result3 = await testCache.get(testKey2);
		if (result3 === null) {
			console.log("✅ Test TTL expiration successful (entry expired)");
		} else {
			console.log("❌ Test TTL expiration failed (entry should be expired)");
			return false;
		}
		
		// Test 4: Non-existent key
		const result4 = await testCache.get("non-existent-key");
		if (result4 === null) {
			console.log("✅ Test non-existent key successful (returned null)");
		} else {
			console.log("❌ Test non-existent key failed");
			return false;
		}
		
		// Test 5: Cache events
		const hasTryEvents = testEvents.some(e => e.event === "try");
		const hasHitEvents = testEvents.some(e => e.event === "hit");
		const hasSetEvents = testEvents.some(e => e.event === "set");
		
		if (hasTryEvents && hasHitEvents && hasSetEvents) {
			console.log("✅ Cache events tracked successfully");
			console.log(`   Total events: ${testEvents.length}`);
		} else {
			console.log("⚠️  Some cache events may be missing");
		}
		
		// Cleanup test data
		const db = sqliteDb.getDatabase();
		if (db) {
			const deleteStmt = db.prepare(`DELETE FROM ${CACHE_TABLE} WHERE key LIKE 'test-%'`);
			deleteStmt.run();
			console.log("✅ Test cleanup successful");
		}
		
		console.log("\n=== All Cache Tests Passed ===");
		return true;
		
	} catch (err) {
		console.log(`❌ Test failed: ${err.message}`);
		console.error(err);
		return false;
	}
}

module.exports = {
	active: sqliteDb.active,
	createCache: createCache,
	test: test
};

