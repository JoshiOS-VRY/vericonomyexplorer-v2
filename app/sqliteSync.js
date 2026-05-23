"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:sqlite-sync");
const sqliteDb = require("./sqliteDb.js");
const coreApi = require("./api/coreApi.js");
const rpcApi = require("./api/rpcApi.js");
const utils = require("./utils.js");
const config = require("./config.js");
const Decimal = require("decimal.js");

let syncInterval = null;
let isSyncing = false;
let isBackfilling = false;
let lastSyncedHeight = null;
let backfillStartHeight = null;

function getLastSyncedHeight() {
	const db = sqliteDb.getDatabase();
	if (!db) {
		return null;
	}

	try {
		const result = db.prepare("SELECT value FROM sync_metadata WHERE key = ?;").get("last_synced_height");
		if (result) {
			return parseInt(result.value);
		}
	} catch (err) {
		utils.logError("sqlite-sync-get-height", err);
	}

	return null;
}

function recoverLastSyncedHeightFromDatabase() {
	// Recover the actual last synced height from the blocks table
	// This fixes cases where metadata is out of sync with actual data
	const db = sqliteDb.getDatabase();
	if (!db) {
		return null;
	}

	try {
		const result = db.prepare("SELECT MAX(height) as max_height FROM blocks;").get();
		if (result && result.max_height !== null) {
			const recoveredHeight = parseInt(result.max_height);
			debugLog(`Recovered last_synced_height from database: ${recoveredHeight}`);
			setLastSyncedHeight(recoveredHeight);
			return recoveredHeight;
		}
	} catch (err) {
		utils.logError("sqlite-sync-recover-height", err);
	}

	return null;
}

function initializeSyncMetadata() {
	// Initialize sync metadata from actual database state on startup
	const db = sqliteDb.getDatabase();
	if (!db) {
		return;
	}

	try {
		const metadataHeight = getLastSyncedHeight();
		const actualMaxHeight = db.prepare("SELECT MAX(height) as max_height FROM blocks;").get();
		
		if (actualMaxHeight && actualMaxHeight.max_height !== null) {
			const actualHeight = parseInt(actualMaxHeight.max_height);
			
			// If metadata is missing or way behind, recover from database
			if (!metadataHeight || actualHeight > metadataHeight + 1000) {
				debugLog(`Sync metadata mismatch detected. Metadata: ${metadataHeight}, Actual: ${actualHeight}. Recovering...`);
				setLastSyncedHeight(actualHeight);
			}
		}
	} catch (err) {
		utils.logError("sqlite-sync-initialize", err);
	}
}

function setLastSyncedHeight(height) {
	const db = sqliteDb.getDatabase();
	if (!db) {
		return;
	}

	try {
		const now = Date.now();
		db.prepare("INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?);").run("last_synced_height", height.toString(), now);
		lastSyncedHeight = height;
	} catch (err) {
		utils.logError("sqlite-sync-set-height", err);
	}
}

async function syncBlock(height) {
	const db = sqliteDb.getDatabase();
	if (!db) {
		return false;
	}

	try {
		// Get block hash
		const blockhash = await rpcApi.getRpcDataWithParams({
			method: "getblockhash",
			parameters: [height]
		});

		if (!blockhash) {
			return false;
		}

		// Get block data with transaction details
		const block = await rpcApi.getRpcDataWithParams({
			method: "getblock",
			parameters: [blockhash, 2] // verbosity 2 = full transaction data with scriptPubKey
		});

		if (!block) {
			return false;
		}

		// Get block stats if available
		let blockStats = null;
		try {
			blockStats = await rpcApi.getRpcDataWithParams({
				method: "getblockstats",
				parameters: [height]
			});
		} catch (err) {
			// Block stats may not be available, continue without it
		}

		// Prepare statements
		const insertBlock = db.prepare(`
			INSERT OR REPLACE INTO blocks (
				height, hash, time, size, weight, tx_count, difficulty, chainwork,
				merkle_root, version, bits, nonce, previous_block_hash, next_block_hash,
				is_orphan, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const insertTx = db.prepare(`
			INSERT OR REPLACE INTO transactions (
				txid, block_height, block_hash, time, size, vsize, weight,
				fee, is_coinbase, vin_count, vout_count, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const insertAddressTx = db.prepare(`
			INSERT OR REPLACE INTO address_txs (
				address, txid, block_height, is_input, is_output, value, vout_index, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const updateAddressBalance = db.prepare(`
			INSERT INTO address_balances (address, balance, tx_count, last_seen_height, updated_at)
			VALUES (?, ?, 1, ?, ?)
			ON CONFLICT(address) DO UPDATE SET
				balance = balance + ?,
				tx_count = tx_count + 1,
				last_seen_height = ?,
				updated_at = ?
		`);

		// Use transaction for atomicity
		const dbTransaction = db.transaction(() => {
			// Insert block
			const now = Date.now();
			insertBlock.run(
				height,
				blockhash,
				block.time,
				block.size || null,
				block.weight || null,
				block.tx ? block.tx.length : 0,
				block.difficulty || null,
				block.chainwork || null,
				block.merkleroot || null,
				block.version || null,
				block.bits || null,
				block.nonce || null,
				block.previousblockhash || null,
				block.nextblockhash || null,
				0, // is_orphan
				now, // created_at
				now  // updated_at
			);

			// Insert transactions and process outputs
			if (block.tx && block.tx.length > 0) {
				for (let i = 0; i < block.tx.length; i++) {
					const tx = block.tx[i];
					const isCoinbase = tx.vin && tx.vin.length > 0 && tx.vin[0].coinbase;

					// Calculate fee (for non-coinbase)
					let fee = null;
					if (!isCoinbase && blockStats && blockStats.totalfee !== undefined) {
						// Approximate fee per transaction (will be refined later)
						fee = blockStats.totalfee / block.tx.length;
					}

					// Insert transaction
					insertTx.run(
						tx.txid,
						height,
						blockhash,
						block.time,
						tx.size || null,
						tx.vsize || null,
						tx.weight || null,
						fee,
						isCoinbase ? 1 : 0,
						tx.vin ? tx.vin.length : 0,
						tx.vout ? tx.vout.length : 0,
						Date.now()
					);

					// Process outputs (addresses receiving)
					if (tx.vout) {
						for (let voutIndex = 0; voutIndex < tx.vout.length; voutIndex++) {
							const vout = tx.vout[voutIndex];
							if (vout.value && vout.value > 0) {
								// Extract addresses from scriptPubKey
								if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
									for (const address of vout.scriptPubKey.addresses) {
										const value = parseFloat(vout.value);

										// Insert address transaction
										insertAddressTx.run(
											address,
											tx.txid,
											height,
											0, // is_input
											1, // is_output
											value,
											voutIndex,
											Date.now()
										);

										// Update address balance (add value)
										updateAddressBalance.run(
											address,
											value,
											height,
											Date.now(),
											value, // increment
											height,
											Date.now()
										);
									}
								}
							}
						}
					}

					// Process inputs (addresses sending)
					// Note: For inputs, we need to look up the previous transaction's output
					// This is done in a second pass after all blocks are synced, or we can
					// query the database for previous outputs. For now, we'll skip input processing
					// during initial sync and handle it separately if needed.
					// Input processing requires txindex or querying previous blocks, which is expensive.
					// We'll focus on outputs first, which gives us receiving addresses and balances.
				}
			}
		});

		dbTransaction();

		return true;
	} catch (err) {
		utils.logError("sqlite-sync-block", err, { height });
		return false;
	}
}

async function syncBlocks(startHeight, endHeight) {
	// Allow backfill and recent sync to run concurrently, but not multiple of the same type
	if (isSyncing && !isBackfilling) {
		debugLog("Recent sync already in progress, skipping");
		return;
	}

	isSyncing = true;
	debugLog(`Starting sync from height ${startHeight} to ${endHeight}`);

	try {
		let synced = 0;
		let failed = 0;

		for (let height = startHeight; height <= endHeight; height++) {
			const success = await syncBlock(height);
			if (success) {
				synced++;
				setLastSyncedHeight(height);
			} else {
				failed++;
			}

			// Log progress every 100 blocks
			if (height % 100 === 0) {
				debugLog(`Sync progress: ${height - startHeight + 1}/${endHeight - startHeight + 1} blocks`);
			}
		}

		debugLog(`Sync complete: ${synced} synced, ${failed} failed`);
	} catch (err) {
		utils.logError("sqlite-sync-blocks", err);
	} finally {
		isSyncing = false;
	}
}

async function syncRecentBlocks(count = 10) {
	try {
		const blockchainInfo = await coreApi.getBlockchainInfo();
		if (!blockchainInfo || !blockchainInfo.blocks) {
			return;
		}

		const currentHeight = blockchainInfo.blocks;
		const lastSynced = getLastSyncedHeight() || currentHeight - count;

		// Sync from last synced to current (or last N blocks if first run)
		const startHeight = Math.max(lastSynced + 1, currentHeight - count + 1);
		const endHeight = currentHeight;

		if (startHeight <= endHeight) {
			await syncBlocks(startHeight, endHeight);
		}
	} catch (err) {
		utils.logError("sqlite-sync-recent", err);
	}
}

async function findGapsInBlocks() {
	// Find gaps in the blocks table (missing heights)
	// Uses an efficient SQL-based approach for large databases
	const db = sqliteDb.getDatabase();
	if (!db) {
		return [];
	}

	try {
		// Get the actual min and max heights in the database
		const range = db.prepare("SELECT MIN(height) as min_height, MAX(height) as max_height, COUNT(*) as count FROM blocks;").get();
		if (!range || range.min_height === null) {
			return [];
		}

		const minHeight = parseInt(range.min_height);
		const maxHeight = parseInt(range.max_height);
		const expectedCount = maxHeight - minHeight + 1;
		const actualCount = parseInt(range.count);
		
		// If count matches expected, no gaps
		if (actualCount === expectedCount) {
			return [];
		}
		
		// For large databases, only check first 10,000 blocks for gaps
		// Most gaps would be at the beginning if they exist
		// This is a performance optimization - we can extend this later if needed
		const checkRange = Math.min(10000, maxHeight - minHeight + 1);
		const gaps = [];
		
		// Use a more efficient approach: check for missing heights in chunks
		// but limit to first 10k blocks to avoid performance issues
		const chunkSize = 1000;
		const maxCheck = minHeight + checkRange;
		
		for (let start = minHeight; start < maxCheck; start += chunkSize) {
			const end = Math.min(start + chunkSize - 1, maxCheck - 1);
			
			// Get existing heights in this range
			const existing = db.prepare(`
				SELECT height FROM blocks 
				WHERE height >= ? AND height <= ?
				ORDER BY height
			`).all(start, end).map(row => parseInt(row.height));
			
			// Find missing heights in this range
			for (let h = start; h <= end; h++) {
				if (!existing.includes(h)) {
					gaps.push(h);
				}
			}
		}
		
		return gaps.sort((a, b) => a - b);
	} catch (err) {
		utils.logError("sqlite-sync-find-gaps", err);
		return [];
	}
}

async function startBackfill(fromHeight = null) {
	if (!sqliteDb.active) {
		debugLog("SQLite not enabled, backfill not started");
		return;
	}

	if (isBackfilling) {
		debugLog("Backfill already in progress");
		return;
	}

	try {
		const blockchainInfo = await coreApi.getBlockchainInfo();
		if (!blockchainInfo || !blockchainInfo.blocks) {
			return;
		}

		const currentHeight = blockchainInfo.blocks;
		const db = sqliteDb.getDatabase();
		
		// Get actual database state
		const dbRange = db.prepare("SELECT MIN(height) as min_height, MAX(height) as max_height, COUNT(*) as count FROM blocks;").get();
		const lastSynced = getLastSyncedHeight();
		
		// Recover metadata if it's way behind
		let actualMaxHeight = null;
		if (dbRange && dbRange.max_height !== null) {
			actualMaxHeight = parseInt(dbRange.max_height);
			if (!lastSynced || actualMaxHeight > lastSynced + 1000) {
				debugLog(`Metadata recovery: Updating last_synced_height from ${lastSynced} to ${actualMaxHeight}`);
				setLastSyncedHeight(actualMaxHeight);
			}
		}
		
		// Determine what needs to be backfilled
		let startHeight = fromHeight;
		let endHeight = currentHeight - 10; // Leave 10 blocks buffer for recent sync
		
		if (startHeight === null) {
			// Auto-detect: start from 0 if database is empty, otherwise from actual max + 1
			if (dbRange && dbRange.count > 0 && actualMaxHeight !== null) {
				// Database has blocks, check if we need to backfill from 0
				const minHeight = parseInt(dbRange.min_height);
				if (minHeight > 0) {
					// Missing blocks from 0 to minHeight
					startHeight = 0;
					endHeight = Math.min(minHeight - 1, endHeight);
					debugLog(`Backfilling missing blocks from genesis: 0 to ${endHeight}`);
				} else {
					// Check for gaps in existing range
					debugLog("Checking for gaps in existing blocks...");
					const gaps = await findGapsInBlocks();
					if (gaps.length > 0) {
						startHeight = gaps[0];
						endHeight = gaps[gaps.length - 1];
						debugLog(`Found ${gaps.length} gaps, backfilling from ${startHeight} to ${endHeight}`);
					} else if (actualMaxHeight < currentHeight - 10) {
						// No gaps, but need to extend forward
						startHeight = actualMaxHeight + 1;
						endHeight = currentHeight - 10;
						debugLog(`Extending forward from ${startHeight} to ${endHeight}`);
					} else {
						debugLog("No backfill needed - database is up to date");
						return;
					}
				}
			} else {
				// Database is empty, start from 0
				startHeight = 0;
				debugLog(`Database empty, starting backfill from genesis`);
			}
		}
		
		// Only backfill if there are blocks to sync
		if (startHeight !== null && startHeight < endHeight) {
			debugLog(`Starting backfill from height ${startHeight} to ${endHeight}`);
			isBackfilling = true;
			backfillStartHeight = startHeight;
			
			// Backfill in chunks to avoid blocking
			const chunkSize = 100; // Sync 100 blocks at a time
			let currentStart = startHeight;
			
			const backfillChunk = async () => {
				if (currentStart > endHeight || !isBackfilling) {
					isBackfilling = false;
					debugLog("Backfill complete");
					// Update metadata to reflect actual max height after backfill
					const finalMax = db.prepare("SELECT MAX(height) as max_height FROM blocks;").get();
					if (finalMax && finalMax.max_height !== null) {
						setLastSyncedHeight(parseInt(finalMax.max_height));
					}
					return;
				}
				
				const chunkEnd = Math.min(currentStart + chunkSize - 1, endHeight);
				debugLog(`Backfilling chunk: ${currentStart} to ${chunkEnd}`);
				
				await syncBlocks(currentStart, chunkEnd);
				
				currentStart = chunkEnd + 1;
				
				// Schedule next chunk (small delay to avoid overwhelming RPC)
				setTimeout(backfillChunk, 1000); // 1 second delay between chunks
			};
			
			backfillChunk().catch(err => {
				utils.logError("sqlite-backfill", err);
				isBackfilling = false;
			});
		} else {
			debugLog("No blocks to backfill");
		}
	} catch (err) {
		utils.logError("sqlite-backfill-start", err);
		isBackfilling = false;
	}
}

function startSyncService(intervalMinutes = 5, startBackfillImmediately = false) {
	if (!sqliteDb.active) {
		debugLog("SQLite not enabled, sync service not started");
		return;
	}

	if (syncInterval) {
		debugLog("Sync service already running");
		return;
	}

	debugLog(`Starting sync service (interval: ${intervalMinutes} minutes)`);

	// Initialize sync metadata from actual database state
	initializeSyncMetadata();

	// Initial sync of recent blocks
	syncRecentBlocks(10).catch(err => {
		utils.logError("sqlite-sync-initial", err);
	});

	// Start backfill if requested
	if (startBackfillImmediately) {
		// Wait a bit for recent sync to complete, then start backfill
		setTimeout(() => {
			startBackfill(null).catch(err => { // null = auto-detect what needs syncing
				utils.logError("sqlite-backfill-delayed", err);
			});
		}, 30000); // Start backfill 30 seconds after startup
	}

	// Periodic sync
	syncInterval = setInterval(() => {
		// Only sync recent blocks if not backfilling
		if (!isBackfilling) {
			syncRecentBlocks(10).catch(err => {
				utils.logError("sqlite-sync-periodic", err);
			});
		}
	}, intervalMinutes * 60 * 1000);
}

function stopSyncService() {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
		debugLog("Sync service stopped");
	}
}

function getBackfillStatus() {
	return {
		isBackfilling: isBackfilling,
		backfillStartHeight: backfillStartHeight,
		lastSyncedHeight: getLastSyncedHeight()
	};
}

module.exports = {
	startSyncService,
	stopSyncService,
	syncRecentBlocks,
	syncBlocks,
	startBackfill,
	getBackfillStatus,
	getLastSyncedHeight,
	setLastSyncedHeight,
	recoverLastSyncedHeightFromDatabase,
	initializeSyncMetadata
};

