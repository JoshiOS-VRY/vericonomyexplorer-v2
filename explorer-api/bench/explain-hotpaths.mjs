import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const dbPath =
  process.env.VCEXP_INDEXER_SQLITE_PATH ??
  path.join(repoRoot, "database", "vericonomy-index.sqlite");

const chain = process.env.BENCH_CHAIN ?? "vrm";
const sampleAddress = process.env.BENCH_ADDRESS ?? "";
const sampleBlock = Number(process.env.BENCH_BLOCK ?? 1);
const sampleTx = process.env.BENCH_TX ?? "";

const plans = [
  {
    name: "richlist top 50",
    sql: `
      SELECT address, balance_sats
      FROM address_balances
      WHERE chain_id = ? AND balance_sats > 0
      ORDER BY balance_sats DESC, address ASC
      LIMIT 50 OFFSET 0
    `,
    params: [chain],
  },
  {
    name: "leaderboard activity",
    sql: `
      SELECT address, tx_count
      FROM address_period_stats
      WHERE chain_id = ? AND period = 'month' AND period_start = (
        SELECT MAX(period_start) FROM address_period_stats WHERE chain_id = ? AND period = 'month'
      )
      ORDER BY tx_count DESC, address ASC
      LIMIT 50
    `,
    params: [chain, chain],
  },
  {
    name: "latest blocks",
    sql: `
      SELECT height, hash FROM blocks
      WHERE chain_id = ? AND status = 'main'
      ORDER BY height DESC
      LIMIT 10
    `,
    params: [chain],
  },
  {
    name: "block txs page",
    sql: `
      SELECT txid FROM transactions
      WHERE chain_id = ? AND block_height = ?
      ORDER BY tx_index ASC
      LIMIT 50 OFFSET 0
    `,
    params: [chain, sampleBlock],
  },
];

if (sampleAddress) {
  plans.push({
    name: "address tx list",
    sql: `
      SELECT address_transactions.txid, COALESCE(address_transactions.net_delta_sats, 0)
      FROM address_transactions
      INNER JOIN transactions
        ON transactions.chain_id = address_transactions.chain_id
        AND transactions.txid = address_transactions.txid
      WHERE address_transactions.chain_id = ? AND address_transactions.address = ?
      ORDER BY address_transactions.first_seen_height DESC, transactions.tx_index DESC
      LIMIT 25 OFFSET 0
    `,
    params: [chain, sampleAddress],
  });
}

if (sampleTx) {
  plans.push({
    name: "tx lookup",
    sql: `SELECT txid FROM transactions WHERE chain_id = ? AND txid = ?`,
    params: [chain, sampleTx],
  });
}

const db = new Database(dbPath, { readonly: true });

console.log(`EXPLAIN plans for ${dbPath}\n`);

for (const plan of plans) {
  console.log(`=== ${plan.name} ===`);
  const rows = db.prepare(`EXPLAIN QUERY PLAN ${plan.sql}`).all(...plan.params);
  for (const row of rows) {
    console.log(row.detail);
  }
  console.log("");
}

db.close();
