"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const dbModule = require("./db.js");
const { ingestBlock } = require("./ingest.js");
const { repairUnresolvedInputs } = require("./repair.js");
const fixtureBlocks = require("./fixtures/simpleSpendBlock.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vericonomy-indexer-v2-repair-"));
const dbPath = path.join(tempDir, "repair-smoke.sqlite");

process.env.VCEXP_INDEXER_SQLITE_PATH = dbPath;

const db = dbModule.openDatabase(dbPath);

ingestBlock("vrc", fixtureBlocks[1], { db });

const before = getState(db);

ingestBlock("vrc", fixtureBlocks[0], { db });

const repair = repairUnresolvedInputs("vrc", { db });
const after = getState(db);

if (before.unresolved !== 1n) {
	throw new Error(`Expected one unresolved input before repair, found ${before.unresolved}`);
}

if (repair.repaired !== 1) {
	throw new Error(`Expected one repaired input, found ${repair.repaired}`);
}

if (after.unresolved !== 0n) {
	throw new Error(`Expected zero unresolved inputs after repair, found ${after.unresolved}`);
}

console.log(JSON.stringify({
	dbPath,
	before,
	repair,
	after
}, bigintReplacer, 2));

dbModule.closeDatabase();

function getState(db) {
	return {
		unresolved: db.prepare(`
			SELECT COUNT(*) AS count
			FROM vins
			WHERE chain_id = 'vrc' AND resolved = 0 AND source = 'unresolved'
		`).get().count,
		balances: db.prepare(`
			SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count
			FROM address_balances
			WHERE chain_id = 'vrc'
			ORDER BY address
		`).all()
	};
}

function bigintReplacer(key, value) {
	return typeof value === "bigint" ? value.toString() : value;
}
