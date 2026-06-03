#!/usr/bin/env node
// One-time ETL: stream a chain's rows from the legacy shared SQLite index into
// the per-chain-partitioned Postgres schema using COPY. No RPC re-index.
//
// Usage (inside a container that has better-sqlite3 + pg + pg-copy-streams):
//   node deploy/option-a/migrate-sqlite-to-postgres.mjs --chain vrc
//   node deploy/option-a/migrate-sqlite-to-postgres.mjs --chain vrm --tables blocks,transactions
//
// Env:
//   VCEXP_INDEXER_SQLITE_PATH  source SQLite (default /app/database/vericonomy-index.sqlite)
//   VCEXP_PG_URL               target Postgres
//
// raw_json columns are intentionally NOT migrated (RPC fallback reconstructs them).

import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { Pool } = require("pg");
const copyFrom = require("pg-copy-streams").from;

function parseArgs(argv) {
	const out = {};
	for (let i = 2; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--chain") out.chain = argv[++i];
		else if (a === "--tables") out.tables = argv[++i];
		else if (a === "--sqlite") out.sqlite = argv[++i];
		else if (a === "--batch") out.batch = Number(argv[++i]);
	}
	return out;
}

// Column list per table (order matters; must match COPY target list).
// raw_json deliberately omitted.
const TABLES = [
	["blocks", ["chain_id", "height", "hash", "previous_hash", "next_hash", "time", "tx_count", "size", "difficulty", "chainwork_or_trust", "flags", "status", "indexed_at", "output_count", "extracted_by", "extracted_by_address", "fee_sats", "total_output_sats"]],
	["transactions", ["chain_id", "txid", "block_height", "block_hash", "tx_index", "time", "is_coinbase", "is_coinstake", "raw_available", "source", "indexed_at"]],
	["vouts", ["chain_id", "txid", "n", "address", "value_sats", "script_type", "script_pub_key", "spent_by_txid", "spent_by_vin", "spent_height", "is_spent"]],
	["vout_addresses", ["chain_id", "txid", "n", "address", "address_index"]],
	["vins", ["chain_id", "txid", "n", "prev_txid", "prev_vout", "address", "value_sats", "source", "resolved"]],
	["address_events", ["chain_id", "id", "address", "txid", "block_height", "time", "delta_sats", "event_type", "source", "created_at"]],
	["address_transactions", ["chain_id", "address", "txid", "first_seen_height", "first_seen_time", "created_at", "net_delta_sats"]],
	["address_balances", ["chain_id", "address", "balance_sats", "total_received_sats", "total_sent_sats", "tx_count", "last_seen_height", "first_seen_height", "first_seen_time", "updated_at"]],
	["richlist_snapshots", ["chain_id", "snapshot_height", "snapshot_time", "rank", "address", "balance_sats", "created_at"]],
	["address_period_stats", ["chain_id", "period", "period_start", "period_end", "address", "received_sats", "sent_sats", "net_sats", "tx_count", "last_seen_height", "last_seen_time", "rank_received", "rank_net", "updated_at"]],
	["chain_activity_buckets", ["chain_id", "bucket_start", "mined_count", "staked_count", "received_count", "block_count", "updated_at"]],
	["address_balance_buckets", ["chain_id", "address", "bucket_start", "mined_sats", "staked_sats", "received_sats", "spent_sats", "delta_sats", "updated_at"]],
	["network_metric_buckets", ["chain_id", "bucket_start", "difficulty", "block_height", "supply", "hashrate_kh_per_min", "interest_rate_percent", "net_stake_weight", "percent_staked", "expected_stake_time_seconds", "address_count", "updated_at"]],
];

function csvCell(value) {
	if (value === null || value === undefined) return "\\N";
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "\\N";
	if (Buffer.isBuffer(value)) value = value.toString("utf8");
	const s = String(value);
	return '"' + s.replace(/"/g, '""') + '"';
}

async function copyTable(sqlite, pool, chain, table, columns, batchSize) {
	const colList = columns.join(", ");
	const total = Number(
		sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE chain_id = ?`).get(chain).c,
	);
	if (total === 0) {
		console.log(`  ${table}: 0 rows`);
		return 0;
	}

	const client = await pool.connect();
	let copied = 0;
	try {
		const stmt = sqlite.prepare(`SELECT ${colList} FROM ${table} WHERE chain_id = ?`);
		const iterator = stmt.iterate(chain);
		const stream = client.query(
			copyFrom(`COPY ${table} (${colList}) FROM STDIN WITH (FORMAT csv, NULL '\\N')`),
		);

		const source = Readable.from((function* () {
			for (const row of iterator) {
				const line = columns.map((c) => csvCell(row[c])).join(",") + "\n";
				copied += 1;
				if (copied % 500000 === 0) {
					process.stderr.write(`    ${table}: ${copied}/${total}\n`);
				}
				yield line;
			}
		})());

		await pipeline(source, stream);
	} finally {
		client.release();
	}

	console.log(`  ${table}: ${copied}/${total} copied`);
	return copied;
}

async function main() {
	const args = parseArgs(process.argv);
	const chain = (args.chain || "").toLowerCase();
	if (chain !== "vrm" && chain !== "vrc") {
		console.error("Usage: --chain <vrm|vrc> [--tables a,b] [--batch N]");
		process.exit(1);
	}

	const sqlitePath = args.sqlite || process.env.VCEXP_INDEXER_SQLITE_PATH || "/app/database/vericonomy-index.sqlite";
	const pgUrl = process.env.VCEXP_PG_URL;
	if (!pgUrl) {
		console.error("VCEXP_PG_URL is required");
		process.exit(1);
	}

	const only = args.tables ? new Set(args.tables.split(",").map((s) => s.trim())) : null;
	const batchSize = Number.isFinite(args.batch) ? args.batch : 50000;

	const sqlite = new Database(sqlitePath, { readonly: true });
	sqlite.defaultSafeIntegers(true);
	sqlite.pragma("busy_timeout = 30000");

	const pool = new Pool({ connectionString: pgUrl, max: 4 });

	console.log(`ETL ${chain}: ${sqlitePath} -> Postgres`);
	const started = Date.now();

	for (const [table, columns] of TABLES) {
		if (only && !only.has(table)) continue;
		await copyTable(sqlite, pool, chain, table, columns, batchSize);
	}

	// Re-align the shared address_events identity sequence to the current max id.
	const maxId = (await pool.query("SELECT COALESCE(MAX(id), 0) AS m FROM address_events")).rows[0].m;
	await pool.query(
		"SELECT setval(pg_get_serial_sequence('address_events','id'), GREATEST($1::bigint, 1))",
		[maxId],
	);

	await pool.end();
	sqlite.close();
	console.log(`ETL ${chain} done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
