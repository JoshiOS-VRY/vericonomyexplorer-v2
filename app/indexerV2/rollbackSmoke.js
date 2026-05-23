"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const dbModule = require("./db.js");
const { ingestBlock } = require("./ingest.js");
const { rollbackFromHeight } = require("./reorg.js");
const fixtureBlocks = require("./fixtures/simpleSpendBlock.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vericonomy-indexer-v2-rollback-"));
const dbPath = path.join(tempDir, "rollback-smoke.sqlite");

process.env.VCEXP_INDEXER_SQLITE_PATH = dbPath;

const db = dbModule.openDatabase(dbPath);

for (const block of fixtureBlocks) {
	ingestBlock("vrc", block, { db });
}

const before = getState(db);
const rollback = rollbackFromHeight("vrc", 2, { db });
const after = getState(db);

if (before.fundingVout.is_spent !== 1n) {
	throw new Error("Expected funding output to be spent before rollback.");
}

if (rollback.blocksRemoved !== 1) {
	throw new Error(`Expected one removed block, found ${rollback.blocksRemoved}`);
}

if (after.fundingVout.is_spent !== 0n) {
	throw new Error("Expected funding output to be unspent after rollback.");
}

if (after.balances.length !== 1 || after.balances[0].address !== "VAddressReceive111111111111111111111") {
	throw new Error("Expected only the funding address to remain after rollback.");
}

if (after.balances[0].balance_sats !== 5000000000n) {
	throw new Error(`Expected funding balance of 50 coins after rollback, found ${after.balances[0].balance_sats}`);
}

console.log(JSON.stringify({
	dbPath,
	before,
	rollback,
	after
}, bigintReplacer, 2));

dbModule.closeDatabase();

function getState(db) {
	return {
		blocks: db.prepare(`
			SELECT height, hash
			FROM blocks
			WHERE chain_id = 'vrc'
			ORDER BY height
		`).all(),
		fundingVout: db.prepare(`
			SELECT txid, n, address, value_sats, is_spent, spent_by_txid
			FROM vouts
			WHERE chain_id = 'vrc' AND txid = ? AND n = 0
		`).get("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
		balances: db.prepare(`
			SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count
			FROM address_balances
			WHERE chain_id = 'vrc'
			ORDER BY address
		`).all(),
		sync: db.prepare(`
			SELECT last_indexed_height, last_indexed_hash, status, status_message
			FROM sync_state
			WHERE chain_id = 'vrc'
		`).get()
	};
}

function bigintReplacer(key, value) {
	return typeof value === "bigint" ? value.toString() : value;
}
