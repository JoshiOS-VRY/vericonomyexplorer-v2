'use strict';

const debug = require('debug');
const debugLog = debug('btcexp:sqlite-address');
const sqliteDb = require('../sqliteDb.js');
const utils = require('../utils.js');
const config = require('../config.js');
const coins = require('../coins.js');

const coinConfig = coins[config.coin];

function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
  return new Promise(function (resolve, reject) {
    if (!sqliteDb.active) {
      resolve({ addressDetails: null, errors: ['SQLite not enabled'] });
      return;
    }

    const db = sqliteDb.getDatabase();
    if (!db) {
      resolve({ addressDetails: null, errors: ['Database not available'] });
      return;
    }

    try {
      // Get address balance
      const balanceResult = db
        .prepare('SELECT balance, tx_count FROM address_balances WHERE address = ?;')
        .get(address);
      const balance = balanceResult ? parseFloat(balanceResult.balance) : 0;
      const txCount = balanceResult ? parseInt(balanceResult.tx_count) : 0;

      // Get transaction IDs for this address
      const orderBy = sort === 'asc' ? 'ASC' : 'DESC';
      const txQuery = `
				SELECT DISTINCT txid, block_height, is_input, is_output, value, vout_index
				FROM address_txs
				WHERE address = ?
				ORDER BY block_height ${orderBy}, txid ${orderBy}
				LIMIT ? OFFSET ?
			`;

      const txs = db.prepare(txQuery).all(address, limit, offset);
      const txids = [...new Set(txs.map((tx) => tx.txid))];

      // Get block heights for transactions
      const blockHeightsByTxid = {};
      for (const tx of txs) {
        if (tx.block_height !== null) {
          blockHeightsByTxid[tx.txid] = tx.block_height;
        }
      }

      // Calculate total received and sent
      let totalReceived = 0;
      let totalSent = 0;

      const receivedQuery = `
				SELECT SUM(value) as total
				FROM address_txs
				WHERE address = ? AND is_output = 1
			`;
      const receivedResult = db.prepare(receivedQuery).get(address);
      if (receivedResult && receivedResult.total) {
        totalReceived = parseFloat(receivedResult.total);
      }

      const sentQuery = `
				SELECT SUM(value) as total
				FROM address_txs
				WHERE address = ? AND is_input = 1
			`;
      const sentResult = db.prepare(sentQuery).get(address);
      if (sentResult && sentResult.total) {
        totalSent = parseFloat(sentResult.total);
      }

      const addressDetails = {
        address: address,
        balance: balance,
        balanceSat: Math.round(balance * coinConfig.baseCurrencyUnit.multiplier),
        txCount: txCount,
        txids: txids,
        blockHeightsByTxid: blockHeightsByTxid,
        totalReceived: totalReceived,
        totalSent: totalSent,
      };

      debugLog(`Address lookup: ${address} - ${txids.length} transactions, balance: ${balance}`);

      resolve({
        addressDetails: addressDetails,
        errors: [],
      });
    } catch (err) {
      utils.logError('sqlite-address-details', err, { address });
      resolve({
        addressDetails: null,
        errors: [err.message],
      });
    }
  });
}

function addressExists(address) {
  if (!sqliteDb.active) {
    return false;
  }

  const db = sqliteDb.getDatabase();
  if (!db) {
    return false;
  }

  try {
    // Quick check: does this address have any transactions in the database?
    const result = db
      .prepare('SELECT COUNT(*) as count FROM address_txs WHERE address = ? LIMIT 1;')
      .get(address);
    return result && result.count > 0;
  } catch (err) {
    utils.logError('sqlite-address-exists', err, { address });
    return false;
  }
}

function getCurrentAddressApiFeatureSupport() {
  return {
    pageNumbers: true,
    sortDesc: true,
    sortAsc: true,
  };
}

module.exports = {
  getAddressDetails: getAddressDetails,
  addressExists: addressExists,
  getCurrentAddressApiFeatureSupport: getCurrentAddressApiFeatureSupport,
};
