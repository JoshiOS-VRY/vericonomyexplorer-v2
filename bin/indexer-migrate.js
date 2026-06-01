#!/usr/bin/env node
"use strict";

require("../app/indexerV2/loadEnv.js");

const Database = require("better-sqlite3");
const dbModule = require("../app/indexerV2/db.js");
const schema = require("../app/indexerV2/schema.js");

const dbPath = dbModule.getDatabasePath();

function readSchemaVersion() {
	const checkDb = new Database(dbPath, { readonly: true });
	checkDb.pragma("busy_timeout = 5000");
	const version = schema.getStoredSchemaVersion(checkDb);
	checkDb.close();
	return version;
}

const before = readSchemaVersion();
process.stderr.write(
	`[indexer-migrate] database=${dbPath} schema=${before} target=${schema.schemaVersion}\n`
);

if (before >= schema.schemaVersion) {
	console.log(JSON.stringify({
		dbPath,
		targetSchemaVersion: schema.schemaVersion,
		schemaVersionBefore: before,
		schemaVersionAfter: before,
		migration: { ran: false, reason: "already-current" }
	}, null, 2));
	process.exit(0);
}

const result = dbModule.ensureDatabaseMigrations(dbPath);
const after = readSchemaVersion();

console.log(JSON.stringify({
	dbPath,
	targetSchemaVersion: schema.schemaVersion,
	schemaVersionBefore: before,
	schemaVersionAfter: after,
	migration: result
}, null, 2));

if (after < schema.schemaVersion) {
	process.exit(1);
}
