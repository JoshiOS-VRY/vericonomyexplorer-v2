#!/usr/bin/env node
/**
 * Compare one address between production Postgres and the isolated reindex DB.
 *
 * Env:
 *   VCEXP_PG_URL              production (vericonomy-postgres / vericonomy)
 *   VCEXP_REINDEX_PG_URL      parity DB (postgres-reindex / vericonomy_reindex)
 *
 * Usage:
 *   node deploy/option-a/reindex-parity/compare-address.mjs VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176
 */

import pg from 'pg';

const ADDRESS = process.argv[2];
if (!ADDRESS) {
  console.error('Usage: compare-address.mjs <address>');
  process.exit(1);
}

const prodUrl = process.env.VCEXP_PG_URL;
const reindexUrl =
  process.env.VCEXP_REINDEX_PG_URL ||
  buildReindexUrlFromProd(prodUrl, process.env.VCEXP_REINDEX_PG_DB || 'vericonomy_reindex');

if (!prodUrl || !reindexUrl) {
  console.error('Set VCEXP_PG_URL and VCEXP_REINDEX_PG_URL');
  process.exit(1);
}

pg.types.setTypeParser(20, (v) => (v === null ? null : BigInt(v)));

const query = `
  SELECT
    (SELECT balance_sats FROM address_balances WHERE chain_id = 'vrm' AND address = $1) AS balance_sats,
    (SELECT total_received_sats FROM address_balances WHERE chain_id = 'vrm' AND address = $1) AS received_sats,
    (SELECT total_sent_sats FROM address_balances WHERE chain_id = 'vrm' AND address = $1) AS sent_sats,
    (SELECT tx_count FROM address_balances WHERE chain_id = 'vrm' AND address = $1) AS tx_count,
    (SELECT COALESCE(SUM(value_sats), 0) FROM vouts WHERE chain_id = 'vrm' AND address = $1 AND is_spent = 0) AS unspent_sats,
    (SELECT COALESCE(SUM(value_sats), 0) FROM vouts WHERE chain_id = 'vrm' AND address = $1) AS all_vouts_sats,
    (SELECT COUNT(*) FROM address_events WHERE chain_id = 'vrm' AND address = $1) AS event_count,
    (SELECT COUNT(*) FROM vouts WHERE chain_id = 'vrm' AND address = $1 AND is_spent = 0) AS unspent_vout_count,
    (SELECT COUNT(*) FROM transactions t
      JOIN address_transactions at ON at.chain_id = t.chain_id AND at.txid = t.txid
      WHERE at.chain_id = 'vrm' AND at.address = $1 AND t.is_coinbase = 1) AS coinbase_tx_count,
    (SELECT last_indexed_height FROM sync_state WHERE chain_id = 'vrm') AS indexed_height
`;

function buildReindexUrlFromProd(prod, dbName) {
  if (!prod) return null;
  const u = new URL(prod);
  u.hostname = process.env.VCEXP_REINDEX_PG_HOST || 'postgres-reindex';
  u.pathname = `/${dbName}`;
  return u.toString();
}

function toCoins(sats) {
  if (sats === null || sats === undefined) return null;
  return Number(sats) / 1e8;
}

function rowToView(row) {
  if (!row || row.balance_sats === null) {
    return { found: false };
  }
  return {
    found: true,
    balance: toCoins(row.balance_sats),
    received: toCoins(row.received_sats),
    sent: toCoins(row.sent_sats),
    txCount: Number(row.tx_count),
    unspent: toCoins(row.unspent_sats),
    allVouts: toCoins(row.all_vouts_sats),
    unspentVoutCount: Number(row.unspent_vout_count),
    eventCount: Number(row.event_count),
    coinbaseTxCount: Number(row.coinbase_tx_count),
    indexedHeight: row.indexed_height === null ? null : Number(row.indexed_height),
  };
}

async function fetch(client, label) {
  const res = await client.query(query, [ADDRESS]);
  return { label, ...rowToView(res.rows[0]) };
}

function diff(a, b) {
  if (a === null || b === null) return null;
  return a - b;
}

const prod = new pg.Client({ connectionString: prodUrl });
const reindex = new pg.Client({ connectionString: reindexUrl });

await prod.connect();
await reindex.connect();

try {
  const [p, r] = await Promise.all([fetch(prod, 'production'), fetch(reindex, 'reindex_rpc')]);

  const report = {
    address: ADDRESS,
    production: p,
    reindex: r,
    delta:
      p.found && r.found
        ? {
            balance: diff(p.balance, r.balance),
            received: diff(p.received, r.received),
            sent: diff(p.sent, r.sent),
            txCount: diff(p.txCount, r.txCount),
            unspent: diff(p.unspent, r.unspent),
            coinbaseTxCount: diff(p.coinbaseTxCount, r.coinbaseTxCount),
          }
        : null,
    interpretation:
      r.found && p.found && Math.abs((p.balance || 0) - (r.balance || 0)) < 0.0001
        ? 'Balances match — legacy SQLite/ETL path likely not the issue for this address.'
        : r.indexedHeight !== null && p.found && r.found && r.balance > p.balance
          ? 'Reindex shows higher balance — production index is missing receives (bootstrap/ETL/ingest gap).'
          : r.indexedHeight !== null && p.found && r.found && r.balance < p.balance
            ? 'Reindex lower than prod — investigate before cutover.'
            : !r.found
              ? 'Reindex not finished or address not indexed yet.'
              : 'Compare when reindex reaches tip.',
  };

  console.log(JSON.stringify(report, null, 2));
} finally {
  await prod.end();
  await reindex.end();
}
