"use strict";

const utils = require("../utils.js");
const dbModule = require("./db.js");
const { computeBlockTotalsRaw } = require("./blockTotals.js");
const {
	createPeriodStatStatements,
	recordAddressPeriodEvent,
	recordAddressBalanceBucket,
	recordBlockActivity,
	recordTransactionActivity
} = require("./periodStats.js");
const {
	decimalToAtomicUnits,
	getVoutAddresses,
	isCoinbaseTx,
	isCoinstakeTx
} = require("./valueUtils.js");

function computeBlockEnrichment(block) {
	const txs = Array.isArray(block.tx) ? block.tx : [];
	let outputCount = 0;

	for (const tx of txs) {
		if (tx && Array.isArray(tx.vout)) {
			outputCount += tx.vout.length;
		}
	}

	const coinbaseTx = txs.length > 0 && typeof txs[0] === "object" ? txs[0] : null;
	const miner = coinbaseTx ? utils.identifyMiner(coinbaseTx, Number(block.height)) : null;

	return {
		output_count: outputCount > 0 ? outputCount : null,
		extracted_by: miner ? miner.name : null,
		extracted_by_address: miner && miner.type === "address-only" ? miner.name : null
	};
}

function createStatements(db) {
	return {
		findBlockByHeight: db.prepare(`
			SELECT hash
			FROM blocks
			WHERE chain_id = ? AND height = ?
		`),

		upsertBlock: db.prepare(`
			INSERT INTO blocks (
				chain_id, height, hash, previous_hash, next_hash, time, tx_count, size,
				difficulty, chainwork_or_trust, flags, status, raw_json, indexed_at,
				output_count, extracted_by, extracted_by_address
			) VALUES (
				@chain_id, @height, @hash, @previous_hash, @next_hash, @time, @tx_count, @size,
				@difficulty, @chainwork_or_trust, @flags, @status, @raw_json, @indexed_at,
				@output_count, @extracted_by, @extracted_by_address
			)
			ON CONFLICT(chain_id, height) DO UPDATE SET
				hash = excluded.hash,
				previous_hash = excluded.previous_hash,
				next_hash = excluded.next_hash,
				time = excluded.time,
				tx_count = excluded.tx_count,
				size = excluded.size,
				difficulty = excluded.difficulty,
				chainwork_or_trust = excluded.chainwork_or_trust,
				flags = excluded.flags,
				status = excluded.status,
				raw_json = excluded.raw_json,
				indexed_at = excluded.indexed_at,
				output_count = excluded.output_count,
				extracted_by = excluded.extracted_by,
				extracted_by_address = excluded.extracted_by_address
		`),

		updateBlockTotals: db.prepare(`
			UPDATE blocks
			SET fee_sats = ?, total_output_sats = ?
			WHERE chain_id = ? AND height = ?
		`),

		upsertTransaction: db.prepare(`
			INSERT INTO transactions (
				chain_id, txid, block_height, block_hash, tx_index, time, is_coinbase,
				is_coinstake, raw_available, source, raw_json, indexed_at
			) VALUES (
				@chain_id, @txid, @block_height, @block_hash, @tx_index, @time, @is_coinbase,
				@is_coinstake, @raw_available, @source, @raw_json, @indexed_at
			)
			ON CONFLICT(chain_id, txid) DO UPDATE SET
				block_height = excluded.block_height,
				block_hash = excluded.block_hash,
				tx_index = excluded.tx_index,
				time = excluded.time,
				is_coinbase = excluded.is_coinbase,
				is_coinstake = excluded.is_coinstake,
				raw_available = excluded.raw_available,
				source = excluded.source,
				raw_json = excluded.raw_json,
				indexed_at = excluded.indexed_at
		`),

		insertVout: db.prepare(`
			INSERT INTO vouts (
				chain_id, txid, n, address, value_sats, script_type, script_pub_key,
				spent_by_txid, spent_by_vin, spent_height, is_spent
			) VALUES (
				@chain_id, @txid, @n, @address, @value_sats, @script_type, @script_pub_key,
				NULL, NULL, NULL, 0
			)
			ON CONFLICT(chain_id, txid, n) DO UPDATE SET
				address = excluded.address,
				value_sats = excluded.value_sats,
				script_type = excluded.script_type,
				script_pub_key = excluded.script_pub_key
		`),

		insertVoutAddress: db.prepare(`
			INSERT OR IGNORE INTO vout_addresses (
				chain_id, txid, n, address, address_index
			) VALUES (?, ?, ?, ?, ?)
		`),

		findVout: db.prepare(`
			SELECT chain_id, txid, n, address, value_sats, is_spent
			FROM vouts
			WHERE chain_id = ? AND txid = ? AND n = ?
		`),

		markVoutSpent: db.prepare(`
			UPDATE vouts
			SET spent_by_txid = ?, spent_by_vin = ?, spent_height = ?, is_spent = 1
			WHERE chain_id = ? AND txid = ? AND n = ? AND is_spent = 0
		`),

		insertVin: db.prepare(`
			INSERT INTO vins (
				chain_id, txid, n, prev_txid, prev_vout, address, value_sats, source, resolved
			) VALUES (
				@chain_id, @txid, @n, @prev_txid, @prev_vout, @address, @value_sats, @source, @resolved
			)
			ON CONFLICT(chain_id, txid, n) DO UPDATE SET
				prev_txid = excluded.prev_txid,
				prev_vout = excluded.prev_vout,
				address = excluded.address,
				value_sats = excluded.value_sats,
				source = excluded.source,
				resolved = excluded.resolved
		`),

		insertAddressEvent: db.prepare(`
			INSERT INTO address_events (
				chain_id, address, txid, block_height, time, delta_sats, event_type, source, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, 'index', ?)
		`),

		insertAddressTransaction: db.prepare(`
			INSERT OR IGNORE INTO address_transactions (
				chain_id, address, txid, first_seen_height, first_seen_time, created_at, net_delta_sats
			) VALUES (?, ?, ?, ?, ?, ?, 0)
		`),

		addAddressTransactionDelta: db.prepare(`
			UPDATE address_transactions
			SET net_delta_sats = COALESCE(net_delta_sats, 0) + ?
			WHERE chain_id = ? AND address = ? AND txid = ?
		`),

		upsertReceiveBalance: db.prepare(`
			INSERT INTO address_balances (
				chain_id, address, balance_sats, total_received_sats, total_sent_sats,
				tx_count, last_seen_height, first_seen_height, first_seen_time, updated_at
			) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, address) DO UPDATE SET
				balance_sats = balance_sats + excluded.balance_sats,
				total_received_sats = total_received_sats + excluded.total_received_sats,
				tx_count = tx_count + excluded.tx_count,
				last_seen_height = excluded.last_seen_height,
				first_seen_height = COALESCE(address_balances.first_seen_height, excluded.first_seen_height),
				first_seen_time = COALESCE(address_balances.first_seen_time, excluded.first_seen_time),
				updated_at = excluded.updated_at
		`),

		upsertSpendBalance: db.prepare(`
			INSERT INTO address_balances (
				chain_id, address, balance_sats, total_received_sats, total_sent_sats,
				tx_count, last_seen_height, first_seen_height, first_seen_time, updated_at
			) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, address) DO UPDATE SET
				balance_sats = balance_sats + excluded.balance_sats,
				total_sent_sats = total_sent_sats + excluded.total_sent_sats,
				tx_count = tx_count + excluded.tx_count,
				last_seen_height = excluded.last_seen_height,
				first_seen_height = COALESCE(address_balances.first_seen_height, excluded.first_seen_height),
				first_seen_time = COALESCE(address_balances.first_seen_time, excluded.first_seen_time),
				updated_at = excluded.updated_at
		`),

		upsertSyncState: db.prepare(`
			INSERT INTO sync_state (
				chain_id, best_rpc_height, last_indexed_height, last_indexed_hash,
				last_checked_height, status, status_message, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id) DO UPDATE SET
				best_rpc_height = excluded.best_rpc_height,
				last_indexed_height = excluded.last_indexed_height,
				last_indexed_hash = excluded.last_indexed_hash,
				last_checked_height = excluded.last_checked_height,
				status = excluded.status,
				status_message = excluded.status_message,
				updated_at = excluded.updated_at
		`)
	};
}

function ingestBlock(chainId, block, options = {}) {
	if (!block || !block.hash || block.height === undefined) {
		throw new Error("Cannot ingest block: missing hash or height");
	}

	const db = options.db || dbModule.openDatabase();
	const statements = createStatements(db);
	const now = Date.now();
	const txs = Array.isArray(block.tx) ? block.tx : [];
	const existingBlock = statements.findBlockByHeight.get(chainId, block.height);
	const storeRawJson = options.storeRawJson !== false;

	if (existingBlock && existingBlock.hash === block.hash && !options.force) {
		return {
			chainId,
			height: block.height,
			hash: block.hash,
			txCount: txs.length,
			skipped: true
		};
	}

	if (existingBlock && existingBlock.hash !== block.hash && !options.force) {
		throw new Error(`Refusing to ingest block ${block.height}: indexed hash ${existingBlock.hash} differs from ${block.hash}. Reorg handling must run first.`);
	}

	const run = db.transaction(() => {
		const periodStatements = createPeriodStatStatements(db);
		const enrichment = computeBlockEnrichment(block);

		statements.upsertBlock.run({
			chain_id: chainId,
			height: block.height,
			hash: block.hash,
			previous_hash: block.previousblockhash || null,
			next_hash: block.nextblockhash || null,
			time: block.time || block.blocktime || 0,
			tx_count: block.nTx !== undefined ? block.nTx : txs.length,
			size: block.size || null,
			difficulty: block.difficulty !== undefined ? String(block.difficulty) : null,
			chainwork_or_trust: block.chainwork || block.chaintrust || null,
			flags: block.flags || null,
			status: "main",
			raw_json: storeRawJson ? JSON.stringify(block) : null,
			indexed_at: now,
			output_count: enrichment.output_count,
			extracted_by: enrichment.extracted_by,
			extracted_by_address: enrichment.extracted_by_address
		});

		for (let txIndex = 0; txIndex < txs.length; txIndex++) {
			ingestTransaction(statements, periodStatements, chainId, block, txs[txIndex], txIndex, now, {
				storeRawJson
			});
		}

		const blockTotals = computeBlockTotalsRaw(db, chainId, block.height, txs.length);
		statements.updateBlockTotals.run(
			blockTotals.feeSats === null ? null : blockTotals.feeSats,
			blockTotals.totalOutputSats,
			chainId,
			block.height
		);

		recordBlockActivity(periodStatements, chainId, block.time || block.blocktime || 0, now);

		statements.upsertSyncState.run(
			chainId,
			options.bestRpcHeight === undefined ? block.height : options.bestRpcHeight,
			block.height,
			block.hash,
			block.height,
			"indexed",
			null,
			now
		);
	});

	run();

	return {
		chainId,
		height: block.height,
		hash: block.hash,
		txCount: txs.length
	};
}

function ingestTransaction(statements, periodStatements, chainId, block, tx, txIndex, now, options = {}) {
	const coinbase = isCoinbaseTx(tx);
	const coinstake = isCoinstakeTx(tx);
	const txid = tx.txid || tx.hash;

	if (!txid) {
		throw new Error(`Cannot ingest transaction at block ${block.height} index ${txIndex}: missing txid`);
	}

	statements.upsertTransaction.run({
		chain_id: chainId,
		txid,
		block_height: block.height,
		block_hash: block.hash,
		tx_index: txIndex,
		time: tx.time || block.time || block.blocktime || 0,
		is_coinbase: coinbase ? 1 : 0,
		is_coinstake: coinstake ? 1 : 0,
		raw_available: options.storeRawJson === false ? 0 : 1,
		source: "index",
		raw_json: options.storeRawJson === false ? null : JSON.stringify(tx),
		indexed_at: now
	});

	processInputs(statements, periodStatements, chainId, block, tx, txid, coinbase, coinstake, now);
	processOutputs(statements, periodStatements, chainId, block, tx, txid, coinbase, coinstake, now);
	recordTransactionActivity(
		periodStatements,
		chainId,
		block.time || block.blocktime || 0,
		coinbase,
		coinstake,
		now
	);
}

function processInputs(statements, periodStatements, chainId, block, tx, txid, coinbase, coinstake, now) {
	const vins = Array.isArray(tx.vin) ? tx.vin : [];

	for (let vinIndex = 0; vinIndex < vins.length; vinIndex++) {
		const vin = vins[vinIndex];

		if (coinbase || vin.coinbase) {
			statements.insertVin.run({
				chain_id: chainId,
				txid,
				n: vinIndex,
				prev_txid: null,
				prev_vout: null,
				address: null,
				value_sats: null,
				source: "coinbase",
				resolved: 0
			});
			continue;
		}

		const previous = vin.txid && vin.vout !== undefined
			? statements.findVout.get(chainId, vin.txid, vin.vout)
			: null;

		const valueSats = previous ? BigInt(previous.value_sats) : null;
		const address = previous ? previous.address : null;

		statements.insertVin.run({
			chain_id: chainId,
			txid,
			n: vinIndex,
			prev_txid: vin.txid || null,
			prev_vout: vin.vout === undefined ? null : vin.vout,
			address,
			value_sats: valueSats,
			source: previous ? "index" : "unresolved",
			resolved: previous ? 1 : 0
		});

		if (previous && address && Number(previous.is_spent) === 0) {
			statements.markVoutSpent.run(txid, vinIndex, block.height, chainId, vin.txid, vin.vout);
			const delta = -valueSats;
			const txCountIncrement = recordAddressTransaction(statements, chainId, address, txid, block, now, delta);
			statements.insertAddressEvent.run(chainId, address, txid, block.height, block.time || 0, delta, "spend", now);
			statements.upsertSpendBalance.run(
				chainId,
				address,
				delta,
				valueSats,
				txCountIncrement,
				block.height,
				block.height,
				block.time || block.blocktime || 0,
				now
			);
			recordAddressPeriodEvent(
				periodStatements,
				chainId,
				address,
				delta,
				block.height,
				block.time || block.blocktime || 0,
				txCountIncrement,
				now
			);
			recordAddressBalanceBucket(
				periodStatements,
				chainId,
				address,
				delta,
				block.time || block.blocktime || 0,
				"spent",
				now
			);
		}
	}
}

function processOutputs(statements, periodStatements, chainId, block, tx, txid, coinbase, coinstake, now) {
	const vouts = Array.isArray(tx.vout) ? tx.vout : [];

	for (let outputIndex = 0; outputIndex < vouts.length; outputIndex++) {
		const vout = vouts[outputIndex];
		const addresses = getVoutAddresses(vout);
		const primaryAddress = addresses[0] || null;
		const valueSats = decimalToAtomicUnits(vout.value || 0);
		const n = vout.n === undefined ? outputIndex : vout.n;

		statements.insertVout.run({
			chain_id: chainId,
			txid,
			n,
			address: primaryAddress,
			value_sats: valueSats,
			script_type: vout.scriptPubKey ? vout.scriptPubKey.type || null : null,
			script_pub_key: vout.scriptPubKey ? JSON.stringify(vout.scriptPubKey) : null
		});

		for (let addressIndex = 0; addressIndex < addresses.length; addressIndex++) {
			statements.insertVoutAddress.run(chainId, txid, n, addresses[addressIndex], addressIndex);
		}

		if (primaryAddress && valueSats > 0n) {
			const txCountIncrement = recordAddressTransaction(statements, chainId, primaryAddress, txid, block, now, valueSats);
			statements.insertAddressEvent.run(chainId, primaryAddress, txid, block.height, block.time || 0, valueSats, "receive", now);
			statements.upsertReceiveBalance.run(
				chainId,
				primaryAddress,
				valueSats,
				valueSats,
				txCountIncrement,
				block.height,
				block.height,
				block.time || block.blocktime || 0,
				now
			);
			const category = coinstake ? "staked" : coinbase ? "mined" : "received";
			recordAddressPeriodEvent(
				periodStatements,
				chainId,
				primaryAddress,
				valueSats,
				block.height,
				block.time || block.blocktime || 0,
				txCountIncrement,
				now
			);
			recordAddressBalanceBucket(
				periodStatements,
				chainId,
				primaryAddress,
				valueSats,
				block.time || block.blocktime || 0,
				category,
				now
			);
		}
	}
}

function recordAddressTransaction(statements, chainId, address, txid, block, now, deltaSats) {
	const firstSeenTime = block.time || block.blocktime || 0;
	const insertResult = statements.insertAddressTransaction.run(
		chainId,
		address,
		txid,
		block.height,
		firstSeenTime,
		now
	);
	statements.addAddressTransactionDelta.run(deltaSats, chainId, address, txid);

	return insertResult.changes > 0 ? 1 : 0;
}

module.exports = {
	ingestBlock
};
