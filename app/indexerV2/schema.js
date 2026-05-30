"use strict";

const schemaVersion = 7;

const tables = [
	`CREATE TABLE IF NOT EXISTS indexer_meta (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at INTEGER NOT NULL
	);`,

	`CREATE TABLE IF NOT EXISTS chains (
		id TEXT PRIMARY KEY,
		ticker TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		network TEXT NOT NULL DEFAULT 'main',
		consensus TEXT NOT NULL,
		rpc_capabilities_json TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);`,

	`CREATE TABLE IF NOT EXISTS sync_state (
		chain_id TEXT PRIMARY KEY,
		best_rpc_height INTEGER,
		last_indexed_height INTEGER,
		last_indexed_hash TEXT,
		last_checked_height INTEGER,
		status TEXT NOT NULL DEFAULT 'idle',
		status_message TEXT,
		updated_at INTEGER NOT NULL,
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS blocks (
		chain_id TEXT NOT NULL,
		height INTEGER NOT NULL,
		hash TEXT NOT NULL,
		previous_hash TEXT,
		next_hash TEXT,
		time INTEGER NOT NULL,
		tx_count INTEGER NOT NULL DEFAULT 0,
		size INTEGER,
		difficulty TEXT,
		chainwork_or_trust TEXT,
		flags TEXT,
		status TEXT NOT NULL DEFAULT 'main',
		raw_json TEXT,
		indexed_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, height),
		UNIQUE (chain_id, hash),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS transactions (
		chain_id TEXT NOT NULL,
		txid TEXT NOT NULL,
		block_height INTEGER NOT NULL,
		block_hash TEXT NOT NULL,
		tx_index INTEGER NOT NULL,
		time INTEGER NOT NULL,
		is_coinbase INTEGER NOT NULL DEFAULT 0,
		is_coinstake INTEGER NOT NULL DEFAULT 0,
		raw_available INTEGER NOT NULL DEFAULT 0,
		source TEXT NOT NULL DEFAULT 'index',
		raw_json TEXT,
		indexed_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, txid),
		FOREIGN KEY (chain_id, block_height) REFERENCES blocks(chain_id, height) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS vouts (
		chain_id TEXT NOT NULL,
		txid TEXT NOT NULL,
		n INTEGER NOT NULL,
		address TEXT,
		value_sats INTEGER NOT NULL DEFAULT 0,
		script_type TEXT,
		script_pub_key TEXT,
		spent_by_txid TEXT,
		spent_by_vin INTEGER,
		spent_height INTEGER,
		is_spent INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (chain_id, txid, n),
		FOREIGN KEY (chain_id, txid) REFERENCES transactions(chain_id, txid) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS vout_addresses (
		chain_id TEXT NOT NULL,
		txid TEXT NOT NULL,
		n INTEGER NOT NULL,
		address TEXT NOT NULL,
		address_index INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (chain_id, txid, n, address),
		FOREIGN KEY (chain_id, txid, n) REFERENCES vouts(chain_id, txid, n) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS vins (
		chain_id TEXT NOT NULL,
		txid TEXT NOT NULL,
		n INTEGER NOT NULL,
		prev_txid TEXT,
		prev_vout INTEGER,
		address TEXT,
		value_sats INTEGER,
		source TEXT NOT NULL DEFAULT 'index',
		resolved INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (chain_id, txid, n),
		FOREIGN KEY (chain_id, txid) REFERENCES transactions(chain_id, txid) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS address_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		chain_id TEXT NOT NULL,
		address TEXT NOT NULL,
		txid TEXT NOT NULL,
		block_height INTEGER NOT NULL,
		time INTEGER NOT NULL,
		delta_sats INTEGER NOT NULL,
		event_type TEXT NOT NULL,
		source TEXT NOT NULL DEFAULT 'index',
		created_at INTEGER NOT NULL,
		FOREIGN KEY (chain_id, txid) REFERENCES transactions(chain_id, txid) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS address_transactions (
		chain_id TEXT NOT NULL,
		address TEXT NOT NULL,
		txid TEXT NOT NULL,
		first_seen_height INTEGER NOT NULL,
		first_seen_time INTEGER NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, address, txid),
		FOREIGN KEY (chain_id, txid) REFERENCES transactions(chain_id, txid) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS address_balances (
		chain_id TEXT NOT NULL,
		address TEXT NOT NULL,
		balance_sats INTEGER NOT NULL DEFAULT 0,
		total_received_sats INTEGER NOT NULL DEFAULT 0,
		total_sent_sats INTEGER NOT NULL DEFAULT 0,
		tx_count INTEGER NOT NULL DEFAULT 0,
		last_seen_height INTEGER,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, address),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS richlist_snapshots (
		chain_id TEXT NOT NULL,
		snapshot_height INTEGER NOT NULL,
		snapshot_time INTEGER NOT NULL,
		rank INTEGER NOT NULL,
		address TEXT NOT NULL,
		balance_sats INTEGER NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, snapshot_height, rank),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS address_period_stats (
		chain_id TEXT NOT NULL,
		period TEXT NOT NULL,
		period_start INTEGER NOT NULL,
		period_end INTEGER NOT NULL,
		address TEXT NOT NULL,
		received_sats INTEGER NOT NULL DEFAULT 0,
		sent_sats INTEGER NOT NULL DEFAULT 0,
		net_sats INTEGER NOT NULL DEFAULT 0,
		tx_count INTEGER NOT NULL DEFAULT 0,
		last_seen_height INTEGER,
		last_seen_time INTEGER,
		rank_received INTEGER,
		rank_net INTEGER,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, period, period_start, address),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS chain_activity_buckets (
		chain_id TEXT NOT NULL,
		bucket_start INTEGER NOT NULL,
		mined_count INTEGER NOT NULL DEFAULT 0,
		staked_count INTEGER NOT NULL DEFAULT 0,
		received_count INTEGER NOT NULL DEFAULT 0,
		block_count INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, bucket_start),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS address_balance_buckets (
		chain_id TEXT NOT NULL,
		address TEXT NOT NULL,
		bucket_start INTEGER NOT NULL,
		mined_sats INTEGER NOT NULL DEFAULT 0,
		staked_sats INTEGER NOT NULL DEFAULT 0,
		received_sats INTEGER NOT NULL DEFAULT 0,
		spent_sats INTEGER NOT NULL DEFAULT 0,
		delta_sats INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, address, bucket_start),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`,

	`CREATE TABLE IF NOT EXISTS network_metric_buckets (
		chain_id TEXT NOT NULL,
		bucket_start INTEGER NOT NULL,
		difficulty REAL,
		block_height INTEGER,
		supply REAL,
		hashrate_kh_per_min REAL,
		interest_rate_percent REAL,
		net_stake_weight REAL,
		percent_staked REAL,
		expected_stake_time_seconds INTEGER,
		address_count INTEGER,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, bucket_start),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`
];

const indexes = [
	"CREATE INDEX IF NOT EXISTS idx_blocks_chain_time ON blocks(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_blocks_chain_status_height ON blocks(chain_id, status, height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_transactions_chain_block ON transactions(chain_id, block_height, tx_index);",
	"CREATE INDEX IF NOT EXISTS idx_transactions_chain_time ON transactions(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_txid ON vouts(chain_id, txid);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_txid ON vins(chain_id, txid);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_address ON vouts(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_spent ON vouts(chain_id, is_spent, address);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_unspent_address ON vouts(chain_id, address, value_sats DESC) WHERE is_spent = 0;",
	"CREATE INDEX IF NOT EXISTS idx_vout_addresses_chain_address ON vout_addresses(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_prevout ON vins(chain_id, prev_txid, prev_vout);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_address ON vins(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_unresolved ON vins(chain_id) WHERE resolved = 0 AND source != 'coinbase';",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_txid ON address_events(chain_id, address, txid);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_txid ON address_events(chain_id, txid);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_height ON address_events(chain_id, address, block_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_height ON address_events(chain_id, block_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_time ON address_events(chain_id, address, time ASC);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_time ON address_events(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_chain_activity_buckets_chain_start ON chain_activity_buckets(chain_id, bucket_start ASC);",
	"CREATE INDEX IF NOT EXISTS idx_address_transactions_chain_address_height ON address_transactions(chain_id, address, first_seen_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_balances_chain_balance ON address_balances(chain_id, balance_sats DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_balances_chain_funded_balance ON address_balances(chain_id, balance_sats DESC, address ASC) WHERE balance_sats > 0;",
	"CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_net ON address_period_stats(chain_id, period, period_start, net_sats DESC);",
	"CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_received ON address_period_stats(chain_id, period, period_start, received_sats DESC);",
	"CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_activity ON address_period_stats(chain_id, period, period_start, tx_count DESC, address ASC);",
	"CREATE INDEX IF NOT EXISTS idx_transactions_chain_block_coinbase ON transactions(chain_id, block_height, is_coinbase) WHERE is_coinbase = 1;",
	"CREATE INDEX IF NOT EXISTS idx_address_balance_buckets_chain_address_start ON address_balance_buckets(chain_id, address, bucket_start ASC);",
	"CREATE INDEX IF NOT EXISTS idx_network_metric_buckets_chain_start ON network_metric_buckets(chain_id, bucket_start ASC);",
	"CREATE INDEX IF NOT EXISTS idx_network_metric_buckets_chain_start_desc ON network_metric_buckets(chain_id, bucket_start DESC);"
];

function getSchemaSql() {
	return tables.concat(indexes).join("\n\n");
}

function tableHasColumn(db, table, column) {
	return db
		.prepare(`PRAGMA table_info(${table})`)
		.all()
		.some((row) => row.name === column);
}

function ensureColumn(db, table, column, definition) {
	if (!tableHasColumn(db, table, column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
}

function getStoredSchemaVersion(db) {
	const row = db.prepare(`
		SELECT value FROM indexer_meta WHERE key = 'schema_version'
	`).get();

	if (!row) {
		return 0;
	}

	const parsed = Number(row.value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function setStoredSchemaVersion(db, version) {
	const now = Date.now();
	db.prepare(`
		INSERT INTO indexer_meta (key, value, updated_at)
		VALUES ('schema_version', ?, ?)
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
	`).run(String(version), now);
}

function runSchemaV6Backfills(db) {
	if (tableHasColumn(db, "address_transactions", "net_delta_sats")) {
		db.exec(`
			UPDATE address_transactions
			SET net_delta_sats = (
				SELECT COALESCE(SUM(delta_sats), 0)
				FROM address_events e
				WHERE e.chain_id = address_transactions.chain_id
					AND e.address = address_transactions.address
					AND e.txid = address_transactions.txid
			)
			WHERE net_delta_sats IS NULL
		`);
	}

	if (tableHasColumn(db, "address_balances", "first_seen_height")) {
		db.exec(`
			UPDATE address_balances
			SET
				first_seen_height = (
					SELECT MIN(first_seen_height)
					FROM address_transactions at
					WHERE at.chain_id = address_balances.chain_id
						AND at.address = address_balances.address
				),
				first_seen_time = (
					SELECT MIN(first_seen_time)
					FROM address_transactions at
					WHERE at.chain_id = address_balances.chain_id
						AND at.address = address_balances.address
				)
			WHERE first_seen_height IS NULL
		`);
	}

	if (tableHasColumn(db, "blocks", "output_count")) {
		db.exec(`
			UPDATE blocks
			SET output_count = (
				SELECT COUNT(*)
				FROM vouts v
				INNER JOIN transactions t
					ON t.chain_id = v.chain_id AND t.txid = v.txid
				WHERE v.chain_id = blocks.chain_id
					AND t.block_height = blocks.height
			)
			WHERE output_count IS NULL
		`);
	}
}

function analyzeDatabase(db) {
	db.exec("ANALYZE");
	try {
		db.pragma("optimize");
	} catch (err) {
		// PRAGMA optimize requires SQLite 3.18+; ignore on older builds.
	}
}

function applyMigrations(db, options = {}) {
	const skipHeavyBackfills = options.skipHeavyBackfills === true;

	// Always repair known legacy column gaps (idempotent). Some databases were
	// stamped schema v2 before these columns were actually added.
	ensureColumn(db, "address_period_stats", "last_seen_height", "INTEGER");
	ensureColumn(db, "address_period_stats", "last_seen_time", "INTEGER");
	ensureColumn(db, "blocks", "output_count", "INTEGER");
	ensureColumn(db, "blocks", "extracted_by", "TEXT");
	ensureColumn(db, "blocks", "extracted_by_address", "TEXT");
	ensureColumn(db, "address_transactions", "net_delta_sats", "INTEGER");
	ensureColumn(db, "address_balances", "first_seen_height", "INTEGER");
	ensureColumn(db, "address_balances", "first_seen_time", "INTEGER");
	ensureColumn(db, "blocks", "fee_sats", "INTEGER");
	ensureColumn(db, "blocks", "total_output_sats", "INTEGER");

	const stored = getStoredSchemaVersion(db);

	for (const indexSql of indexes) {
		db.exec(indexSql);
	}

	if (!skipHeavyBackfills) {
		if (stored < 6) {
			runSchemaV6Backfills(db);
			analyzeDatabase(db);
		}

		if (stored < 7) {
			db.exec("DROP INDEX IF EXISTS idx_blocks_chain_hash;");
			runSchemaV7Backfills(db);
			analyzeDatabase(db);
		}

		if (stored < schemaVersion) {
			setStoredSchemaVersion(db, schemaVersion);
		}
	}
}

function runSchemaV7Backfills(db) {
	if (!tableHasColumn(db, "blocks", "fee_sats")) {
		return;
	}

	const { computeBlockTotalsRaw } = require("./blockTotals.js");
	const rows = db.prepare(`
		SELECT chain_id, height, tx_count
		FROM blocks
		WHERE status = 'main' AND fee_sats IS NULL
	`).all();
	const updateTotals = db.prepare(`
		UPDATE blocks
		SET fee_sats = ?, total_output_sats = ?
		WHERE chain_id = ? AND height = ?
	`);

	for (const row of rows) {
		const totals = computeBlockTotalsRaw(
			db,
			row.chain_id,
			Number(row.height),
			Number(row.tx_count)
		);

		updateTotals.run(
			totals.feeSats === null ? null : totals.feeSats,
			totals.totalOutputSats,
			row.chain_id,
			row.height
		);
	}
}

function applySchema(db, options = {}) {
	db.exec(getSchemaSql());
	applyMigrations(db, options);
	if (options.skipHeavyBackfills !== true) {
		setStoredSchemaVersion(db, schemaVersion);
	}
}

module.exports = {
	schemaVersion,
	tables,
	indexes,
	getSchemaSql,
	applySchema,
	applyMigrations,
	runSchemaV6Backfills,
	runSchemaV7Backfills,
	analyzeDatabase,
	ensureColumn,
	tableHasColumn,
	getStoredSchemaVersion
};
