#!/usr/bin/env node
"use strict";

require("../app/indexerV2/loadEnv.js");

const dbModule = require("../app/indexerV2/db.js");
const schema = require("../app/indexerV2/schema.js");

const dbPath = dbModule.getDatabasePath();
const db = dbModule.openDatabase(dbPath);

const columns = db
	.prepare("PRAGMA table_info(address_period_stats)")
	.all()
	.map((row) => row.name);

const required = ["last_seen_height", "last_seen_time"];
const missing = required.filter((name) => !columns.includes(name));

console.log(JSON.stringify({
	dbPath,
	schemaVersion: schema.getStoredSchemaVersion(db),
	columns,
	missing,
	ok: missing.length === 0
}, null, 2));

dbModule.closeDatabase();

if (missing.length > 0) {
	process.exit(1);
}
