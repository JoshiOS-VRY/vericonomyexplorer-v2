'use strict';

const dbModule = require('./db.js');

function createStatements(db) {
  return {
    findUnresolvedVins: db.prepare(`
			SELECT
				vins.chain_id,
				vins.txid,
				vins.n,
				vins.prev_txid,
				vins.prev_vout,
				transactions.block_height,
				transactions.time
			FROM vins
			JOIN transactions ON transactions.chain_id = vins.chain_id AND transactions.txid = vins.txid
			WHERE vins.chain_id = ?
				AND vins.resolved = 0
				AND vins.source = 'unresolved'
				AND vins.prev_txid IS NOT NULL
				AND vins.prev_vout IS NOT NULL
			ORDER BY transactions.block_height, vins.txid, vins.n
			LIMIT ?
		`),

    findVout: db.prepare(`
			SELECT chain_id, txid, n, address, value_sats, is_spent
			FROM vouts
			WHERE chain_id = ? AND txid = ? AND n = ?
		`),

    updateVinResolved: db.prepare(`
			UPDATE vins
			SET address = ?, value_sats = ?, source = 'index-repair', resolved = 1
			WHERE chain_id = ? AND txid = ? AND n = ? AND resolved = 0
		`),

    markVoutSpent: db.prepare(`
			UPDATE vouts
			SET spent_by_txid = ?, spent_by_vin = ?, spent_height = ?, is_spent = 1
			WHERE chain_id = ? AND txid = ? AND n = ? AND is_spent = 0
		`),

    insertAddressEvent: db.prepare(`
			INSERT INTO address_events (
				chain_id, address, txid, block_height, time, delta_sats, event_type, source, created_at
			) VALUES (?, ?, ?, ?, ?, ?, 'spend', 'index-repair', ?)
		`),

    insertAddressTransaction: db.prepare(`
			INSERT OR IGNORE INTO address_transactions (
				chain_id, address, txid, first_seen_height, first_seen_time, created_at, net_delta_sats
			) VALUES (?, ?, ?, ?, ?, ?, 0)
		`),

    addAddressTransactionDelta: db.prepare(`
			UPDATE address_transactions
			SET net_delta_sats = COALESCE(net_delta_sats, 0) + ?
			WHERE chain_id = ? AND address = ? AND txid = ?
		`),

    upsertSpendBalance: db.prepare(`
			INSERT INTO address_balances (
				chain_id, address, balance_sats, total_received_sats, total_sent_sats,
				tx_count, last_seen_height, first_seen_height, first_seen_time, updated_at
			) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(chain_id, address) DO UPDATE SET
				balance_sats = balance_sats + excluded.balance_sats,
				total_sent_sats = total_sent_sats + excluded.total_sent_sats,
				tx_count = tx_count + excluded.tx_count,
				last_seen_height = excluded.last_seen_height,
				first_seen_height = COALESCE(address_balances.first_seen_height, excluded.first_seen_height),
				first_seen_time = COALESCE(address_balances.first_seen_time, excluded.first_seen_time),
				updated_at = excluded.updated_at
		`),
  };
}

function repairUnresolvedInputs(chainId, options = {}) {
  const db = options.db || dbModule.openDatabase();
  const limit = Math.max(1, Number(options.limit || 1000));
  const statements = createStatements(db);
  const rows = statements.findUnresolvedVins.all(chainId, limit);
  const now = Date.now();
  const summary = {
    chainId,
    scanned: rows.length,
    repaired: 0,
    stillUnresolved: 0,
    alreadySpent: 0,
    noAddress: 0,
  };

  const run = db.transaction(() => {
    for (const vin of rows) {
      const previous = statements.findVout.get(chainId, vin.prev_txid, vin.prev_vout);

      if (!previous) {
        summary.stillUnresolved++;
        continue;
      }

      if (!previous.address) {
        statements.updateVinResolved.run(null, previous.value_sats, chainId, vin.txid, vin.n);
        summary.noAddress++;
        continue;
      }

      if (Number(previous.is_spent) !== 0) {
        statements.updateVinResolved.run(
          previous.address,
          previous.value_sats,
          chainId,
          vin.txid,
          vin.n
        );
        summary.alreadySpent++;
        continue;
      }

      const valueSats = BigInt(previous.value_sats);
      const delta = -valueSats;
      const blockHeight = Number(vin.block_height);
      const time = Number(vin.time || 0);
      const txCountIncrement = recordAddressTransaction(
        statements,
        chainId,
        previous.address,
        vin.txid,
        blockHeight,
        time,
        now,
        delta
      );

      statements.updateVinResolved.run(previous.address, valueSats, chainId, vin.txid, vin.n);
      statements.markVoutSpent.run(
        vin.txid,
        vin.n,
        blockHeight,
        chainId,
        vin.prev_txid,
        vin.prev_vout
      );
      statements.insertAddressEvent.run(
        chainId,
        previous.address,
        vin.txid,
        blockHeight,
        time,
        delta,
        now
      );
      statements.upsertSpendBalance.run(
        chainId,
        previous.address,
        delta,
        valueSats,
        txCountIncrement,
        blockHeight,
        blockHeight,
        time,
        now
      );
      summary.repaired++;
    }
  });

  run();

  return summary;
}

function recordAddressTransaction(
  statements,
  chainId,
  address,
  txid,
  blockHeight,
  time,
  now,
  deltaSats
) {
  const insertResult = statements.insertAddressTransaction.run(
    chainId,
    address,
    txid,
    blockHeight,
    time,
    now
  );
  statements.addAddressTransactionDelta.run(deltaSats, chainId, address, txid);

  return insertResult.changes > 0 ? 1 : 0;
}

module.exports = {
  repairUnresolvedInputs,
};
