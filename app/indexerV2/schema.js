"use strict";

const schemaVersion = 1;

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
		rank_received INTEGER,
		rank_net INTEGER,
		updated_at INTEGER NOT NULL,
		PRIMARY KEY (chain_id, period, period_start, address),
		FOREIGN KEY (chain_id) REFERENCES chains(id) ON DELETE CASCADE
	);`
];

const indexes = [
	"CREATE INDEX IF NOT EXISTS idx_blocks_chain_hash ON blocks(chain_id, hash);",
	"CREATE INDEX IF NOT EXISTS idx_blocks_chain_time ON blocks(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_blocks_chain_status_height ON blocks(chain_id, status, height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_transactions_chain_block ON transactions(chain_id, block_height, tx_index);",
	"CREATE INDEX IF NOT EXISTS idx_transactions_chain_time ON transactions(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_address ON vouts(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_vouts_chain_spent ON vouts(chain_id, is_spent, address);",
	"CREATE INDEX IF NOT EXISTS idx_vout_addresses_chain_address ON vout_addresses(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_prevout ON vins(chain_id, prev_txid, prev_vout);",
	"CREATE INDEX IF NOT EXISTS idx_vins_chain_address ON vins(chain_id, address);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_address_height ON address_events(chain_id, address, block_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_height ON address_events(chain_id, block_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_events_chain_time ON address_events(chain_id, time DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_transactions_chain_address_height ON address_transactions(chain_id, address, first_seen_height DESC);",
	"CREATE INDEX IF NOT EXISTS idx_address_balances_chain_balance ON address_balances(chain_id, balance_sats DESC);",
	"CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_net ON address_period_stats(chain_id, period, period_start, net_sats DESC);",
	"CREATE INDEX IF NOT EXISTS idx_period_stats_chain_period_received ON address_period_stats(chain_id, period, period_start, received_sats DESC);"
];

function getSchemaSql() {
	return tables.concat(indexes).join("\n\n");
}

function applySchema(db) {
	db.exec(getSchemaSql());

	const now = Date.now();
	db.prepare(`
		INSERT INTO indexer_meta (key, value, updated_at)
		VALUES ('schema_version', ?, ?)
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
	`).run(String(schemaVersion), now);
}

module.exports = {
	schemaVersion,
	tables,
	indexes,
	getSchemaSql,
	applySchema
};
