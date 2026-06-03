"use strict";

// Postgres client + a better-sqlite3-shaped async wrapper so the ported query
// and ingest code can run against either backend through one interface:
//   await db.get(sql, params)   -> first row or undefined
//   await db.all(sql, params)   -> rows[]
//   await db.run(sql, params)   -> { changes, rows }
//   await db.transaction(fn)    -> runs fn(txDb) inside BEGIN/COMMIT
//
// SQL is written with `?` placeholders (SQLite style) and converted to `$n`
// here, so the same SQL strings work on both engines.

const pg = require("pg");

// Preserve exact 64-bit integer semantics (matches better-sqlite3 safeIntegers).
pg.types.setTypeParser(20, (value) => (value === null ? null : BigInt(value))); // int8 -> BigInt

let pool = null;

function getPool() {
	if (pool) {
		return pool;
	}

	const connectionString = process.env.VCEXP_PG_URL;
	if (!connectionString) {
		throw new Error("VCEXP_PG_URL is required when VCEXP_DB_BACKEND=postgres");
	}

	pool = new pg.Pool({
		connectionString,
		max: Number(process.env.VCEXP_PG_POOL_MAX ?? 10),
		idleTimeoutMillis: Number(process.env.VCEXP_PG_IDLE_MS ?? 30_000),
		connectionTimeoutMillis: Number(process.env.VCEXP_PG_CONNECT_MS ?? 10_000),
		statement_timeout: Number(process.env.VCEXP_PG_STATEMENT_TIMEOUT_MS ?? 120_000),
		application_name: process.env.VCEXP_PG_APP_NAME ?? "vericonomy-explorer",
	});

	pool.on("error", (err) => {
		process.stderr.write(`[pg] idle client error: ${err.message}\n`);
	});

	return pool;
}

const placeholderCache = new Map();

// Convert `?` placeholders to `$1..$n`, ignoring `?` inside single-quoted literals.
function toPgPlaceholders(sql) {
	const cached = placeholderCache.get(sql);
	if (cached) {
		return cached;
	}

	let out = "";
	let index = 0;
	let inString = false;

	for (let i = 0; i < sql.length; i += 1) {
		const ch = sql[i];
		if (ch === "'") {
			inString = !inString;
			out += ch;
			continue;
		}
		if (ch === "?" && !inString) {
			index += 1;
			out += `$${index}`;
			continue;
		}
		out += ch;
	}

	placeholderCache.set(sql, out);
	return out;
}

// Postgres infers parameter types from context; sending BigInt as a numeric
// string lets `bigint_col > $1` work without an explicit cast and avoids any
// driver-version differences in BigInt serialization.
function coerceParam(value) {
	return typeof value === "bigint" ? value.toString() : value;
}

function normalizeParams(params) {
	if (params === undefined) {
		return [];
	}
	const arr = Array.isArray(params) ? params : [params];
	return arr.map(coerceParam);
}

const preparedCache = new Map();

// Compile a SQLite-style statement (positional `?` or named `@name`) into a
// Postgres text + an argument-binder. Mirrors better-sqlite3 statement calling:
//   stmt.get(a, b)      (positional)
//   stmt.run({ a, b })  (named)
function compileStatement(sql) {
	const cached = preparedCache.get(sql);
	if (cached) {
		return cached;
	}

	const namedTokens = sql.match(/@[A-Za-z_][A-Za-z0-9_]*/g);
	let compiled;

	if (namedTokens) {
		const order = [];
		const indexByName = new Map();
		const text = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name) => {
			if (!indexByName.has(name)) {
				order.push(name);
				indexByName.set(name, order.length);
			}
			return `$${indexByName.get(name)}`;
		});
		compiled = {
			text,
			named: true,
			bind: (args) => {
				const obj = args[0] || {};
				return order.map((name) => coerceParam(obj[name]));
			},
		};
	} else {
		compiled = {
			text: toPgPlaceholders(sql),
			named: false,
			bind: (args) => {
				const raw = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
				return raw.map(coerceParam);
			},
		};
	}

	preparedCache.set(sql, compiled);
	return compiled;
}

function makeDb(executor) {
	const db = {
		backend: "postgres",
		raw: executor,

		async get(sql, params) {
			const result = await executor.query(toPgPlaceholders(sql), normalizeParams(params));
			return result.rows[0];
		},

		async all(sql, params) {
			const result = await executor.query(toPgPlaceholders(sql), normalizeParams(params));
			return result.rows;
		},

		async run(sql, params) {
			const result = await executor.query(toPgPlaceholders(sql), normalizeParams(params));
			return { changes: result.rowCount ?? 0, rows: result.rows };
		},

		async exec(sql) {
			await executor.query(sql);
		},

		// better-sqlite3-shaped prepared statement (async). Lets ported code keep
		// `prepare(db, sql).get(a, b)` / `.run({named})` with just an added await.
		prepare(sql) {
			const compiled = compileStatement(sql);
			return {
				async get(...args) {
					const result = await executor.query(compiled.text, compiled.bind(args));
					return result.rows[0];
				},
				async all(...args) {
					const result = await executor.query(compiled.text, compiled.bind(args));
					return result.rows;
				},
				async run(...args) {
					const result = await executor.query(compiled.text, compiled.bind(args));
					return { changes: result.rowCount ?? 0, rows: result.rows };
				},
			};
		},

		pragma() {
			/* no-op on Postgres */
		},

		// Runs fn against a dedicated client inside a transaction. fn receives a
		// db bound to that client so nested get/all/run share the transaction.
		async runTransaction(fn) {
			return db.transaction(fn);
		},

		async transaction(fn) {
			if (executor instanceof pg.Pool) {
				const client = await executor.connect();
				const txDb = makeDb(client);
				try {
					await client.query("BEGIN");
					const value = await fn(txDb);
					await client.query("COMMIT");
					return value;
				} catch (err) {
					try {
						await client.query("ROLLBACK");
					} catch {
						/* ignore rollback failure */
					}
					throw err;
				} finally {
					client.release();
				}
			}

			// Already inside a transaction (executor is a checked-out client).
			return fn(db);
		},
	};

	return db;
}

function openPostgres() {
	return makeDb(getPool());
}

async function closePostgres() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}

module.exports = {
	getPool,
	openPostgres,
	closePostgres,
	makeDb,
	toPgPlaceholders,
};
