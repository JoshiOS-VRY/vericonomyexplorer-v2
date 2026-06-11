'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const schema = require('./schema.js');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vericonomy-schema-migration-'));
const dbPath = path.join(tempDir, 'legacy.sqlite');
const db = new Database(dbPath);

db.exec(`
	CREATE TABLE indexer_meta (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at INTEGER NOT NULL
	);

	INSERT INTO indexer_meta (key, value, updated_at)
	VALUES ('schema_version', '1', ${Date.now()});

	CREATE TABLE address_period_stats (
		chain_id TEXT NOT NULL,
		period TEXT NOT NULL,
		period_start INTEGER NOT NULL,
		period_end INTEGER NOT NULL,
		address TEXT NOT NULL,
		received_sats INTEGER NOT NULL DEFAULT 0,
		sent_sats INTEGER NOT NULL DEFAULT 0,
		net_sats INTEGER NOT NULL DEFAULT 0,
		tx_count INTEGER NOT NULL DEFAULT 0,
		rank_received INTEGER,
		rank_net INTEGER,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, period, period_start, address)
	);
`);

schema.applyMigrations(db);

const columns = db
  .prepare('PRAGMA table_info(address_period_stats)')
  .all()
  .map((row) => row.name);

const required = ['last_seen_height', 'last_seen_time'];
const missing = required.filter((name) => !columns.includes(name));

if (missing.length > 0) {
  console.error(`Migration failed, missing columns: ${missing.join(', ')}`);
  process.exit(1);
}

if (schema.getStoredSchemaVersion(db) < schema.schemaVersion) {
  console.error(`Migration failed, schema_version not bumped to ${schema.schemaVersion}`);
  process.exit(1);
}

db.prepare(
  `
	INSERT INTO address_period_stats (
		chain_id, period, period_start, period_end, address,
		received_sats, sent_sats, net_sats, tx_count,
		last_seen_height, last_seen_time, updated_at
	) VALUES ('vrm', 'week', 1, 2, 'test', 0, 0, 0, 0, 100, 200, 300)
`
).run();

console.log(
  JSON.stringify(
    {
      ok: true,
      dbPath,
      columns,
      schemaVersion: schema.getStoredSchemaVersion(db),
    },
    null,
    2
  )
);

db.close();
fs.rmSync(tempDir, { recursive: true, force: true });
