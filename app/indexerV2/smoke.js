"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const dbModule = require("./db.js");
const { ingestBlock } = require("./ingest.js");
const { decimalToAtomicUnits } = require("./valueUtils.js");
const fixtureBlocks = require("./fixtures/simpleSpendBlock.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vericonomy-indexer-v2-"));
const dbPath = path.join(tempDir, "smoke.sqlite");

process.env.VCEXP_INDEXER_SQLITE_PATH = dbPath;

const db = dbModule.openDatabase(dbPath);

assertAtomic("8e-8", 8n);
assertAtomic("1.23456789", 123456789n);
assertAtomic("1.23e3", 123000000000n);

for (const block of fixtureBlocks) {
	ingestBlock("vrc", block, { db });
}

const balances = db.prepare(`
	SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count
	FROM address_balances
	WHERE chain_id = 'vrc'
	ORDER BY address
`).all();

console.log(JSON.stringify({
	dbPath,
	balances
}, bigintReplacer, 2));

dbModule.closeDatabase();

function bigintReplacer(key, value) {
	return typeof value === "bigint" ? value.toString() : value;
}

function assertAtomic(value, expected) {
	const actual = decimalToAtomicUnits(value);
	if (actual !== expected) {
		throw new Error(`Expected ${value} to convert to ${expected}, got ${actual}`);
	}
}
