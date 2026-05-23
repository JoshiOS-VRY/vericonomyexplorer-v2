"use strict";

const dbModule = require("./db.js");

function createStatements(db) {
	return {
		findBlocks: db.prepare(`
			SELECT height, hash
			FROM blocks
			WHERE chain_id = ? AND height >= ? AND status = 'main'
			ORDER BY height DESC
		`),

		findRollbackTxids: db.prepare(`
			SELECT txid
			FROM transactions
			WHERE chain_id = ? AND block_height >= ?
		`),

		findAffectedAddresses: db.prepare(`
			SELECT DISTINCT address
			FROM address_events
			WHERE chain_id = ? AND block_height >= ? AND address IS NOT NULL
		`),

		clearSpentMarkersForTxids: db.prepare(`
			UPDATE vouts
			SET spent_by_txid = NULL,
				spent_by_vin = NULL,
				spent_height = NULL,
				is_spent = 0
			WHERE chain_id = ?
				AND spent_by_txid = ?
		`),

		deleteBlocksFromHeight: db.prepare(`
			DELETE FROM blocks
			WHERE chain_id = ? AND height >= ?
		`),

		deleteAddressBalance: db.prepare(`
			DELETE FROM address_balances
			WHERE chain_id = ? AND address = ?
		`),

		findAddressAggregate: db.prepare(`
			SELECT
				COALESCE(SUM(delta_sats), 0) AS balance_sats,
				COALESCE(SUM(CASE WHEN delta_sats > 0 THEN delta_sats ELSE 0 END), 0) AS total_received_sats,
				COALESCE(SUM(CASE WHEN delta_sats < 0 THEN -delta_sats ELSE 0 END), 0) AS total_sent_sats,
				MAX(block_height) AS last_seen_height
			FROM address_events
			WHERE chain_id = ? AND address = ?
		`),

		findAddressTxCount: db.prepare(`
			SELECT COUNT(*) AS tx_count
			FROM address_transactions
			WHERE chain_id = ? AND address = ?
		`),

		insertAddressBalance: db.prepare(`
			INSERT INTO address_balances (
				chain_id, address, balance_sats, total_received_sats, total_sent_sats,
				tx_count, last_seen_height, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`),

		findPreviousTip: db.prepare(`
			SELECT height, hash
			FROM blocks
			WHERE chain_id = ? AND status = 'main'
			ORDER BY height DESC
			LIMIT 1
		`),

		upsertSyncState: db.prepare(`
			INSERT INTO sync_state (
				chain_id, best_rpc_height, last_indexed_height, last_indexed_hash,
				last_checked_height, status, status_message, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id) DO UPDATE SET
				last_indexed_height = excluded.last_indexed_height,
				last_indexed_hash = excluded.last_indexed_hash,
				last_checked_height = excluded.last_checked_height,
				status = excluded.status,
				status_message = excluded.status_message,
				updated_at = excluded.updated_at
		`)
	};
}

function rollbackFromHeight(chainId, fromHeight, options = {}) {
	const db = options.db || dbModule.openDatabase();
	const height = Number(fromHeight);

	if (!Number.isInteger(height) || height < 0) {
		throw new Error(`Invalid rollback height: ${fromHeight}`);
	}

	const statements = createStatements(db);
	const blocks = statements.findBlocks.all(chainId, height);
	const txids = statements.findRollbackTxids.all(chainId, height).map(row => row.txid);
	const affectedAddresses = statements.findAffectedAddresses.all(chainId, height).map(row => row.address);
	const now = Date.now();
	const summary = {
		chainId,
		fromHeight: height,
		blocksRemoved: blocks.length,
		transactionsRemoved: txids.length,
		affectedAddresses: affectedAddresses.length,
		spentMarkersCleared: 0,
		newTipHeight: null,
		newTipHash: null
	};

	const run = db.transaction(() => {
		for (const txid of txids) {
			const result = statements.clearSpentMarkersForTxids.run(chainId, txid);
			summary.spentMarkersCleared += Number(result.changes || 0);
		}

		statements.deleteBlocksFromHeight.run(chainId, height);

		for (const address of affectedAddresses) {
			rebuildAddressBalance(statements, chainId, address, now);
		}

		const previousTip = statements.findPreviousTip.get(chainId);
		summary.newTipHeight = previousTip ? Number(previousTip.height) : null;
		summary.newTipHash = previousTip ? previousTip.hash : null;

		statements.upsertSyncState.run(
			chainId,
			null,
			summary.newTipHeight,
			summary.newTipHash,
			summary.newTipHeight,
			"rolled-back",
			`Rolled back from height ${height}`,
			now
		);
	});

	run();

	return summary;
}

function rebuildAddressBalance(statements, chainId, address, now) {
	statements.deleteAddressBalance.run(chainId, address);

	const aggregate = statements.findAddressAggregate.get(chainId, address);
	const txCount = statements.findAddressTxCount.get(chainId, address).tx_count;

	if (!aggregate.last_seen_height && Number(txCount) === 0) {
		return;
	}

	statements.insertAddressBalance.run(
		chainId,
		address,
		aggregate.balance_sats,
		aggregate.total_received_sats,
		aggregate.total_sent_sats,
		txCount,
		aggregate.last_seen_height,
		now
	);
}

module.exports = {
	rollbackFromHeight
};
