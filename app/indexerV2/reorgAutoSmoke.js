'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const dbModule = require('./db.js');
const { ingestBlock } = require('./ingest.js');
const { syncRange } = require('./worker.js');
const fixtureBlocks = require('./fixtures/simpleSpendBlock.js');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vericonomy-indexer-v2-auto-reorg-'));
const dbPath = path.join(tempDir, 'auto-reorg-smoke.sqlite');

process.env.VCEXP_INDEXER_SQLITE_PATH = dbPath;

const db = dbModule.openDatabase(dbPath);
const replacementBlock = createReplacementBlock();
const rpc = createFakeRpc([fixtureBlocks[0], replacementBlock]);

for (const block of fixtureBlocks) {
  ingestBlock('vrc', block, { db, bestRpcHeight: 2 });
}

syncRange({
  chain: 'vrc',
  startHeight: 2,
  endHeight: 2,
  db,
  rpc,
})
  .then((result) => {
    const state = getState(db);

    if (result.indexed !== 1) {
      throw new Error(`Expected one replacement block to be indexed, found ${result.indexed}`);
    }

    if (state.blocks.length !== 2 || state.blocks[1].hash !== replacementBlock.hash) {
      throw new Error('Expected replacement block at height 2 after automatic rollback.');
    }

    if (state.balances.find((row) => row.address === 'VAddressReceive333333333333333333')) {
      throw new Error('Expected old rolled-back recipient to be removed from balances.');
    }

    if (!state.balances.find((row) => row.address === 'VAddressReplacement444444444444444')) {
      throw new Error('Expected replacement recipient balance after automatic rollback.');
    }

    console.log(
      JSON.stringify(
        {
          dbPath,
          result,
          state,
        },
        bigintReplacer,
        2
      )
    );

    dbModule.closeDatabase();
  })
  .catch((err) => {
    dbModule.closeDatabase();
    throw err;
  });

function createReplacementBlock() {
  return {
    hash: '00000000000000000000000000000000000000000000000000000000000000ff',
    height: 2,
    time: 1700000090,
    size: 1000,
    difficulty: 1,
    previousblockhash: fixtureBlocks[0].hash,
    tx: [
      {
        txid: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        vin: [
          {
            txid: fixtureBlocks[0].tx[0].txid,
            vout: 0,
          },
        ],
        vout: [
          {
            value: 49.9999,
            n: 0,
            scriptPubKey: {
              type: 'pubkeyhash',
              address: 'VAddressReplacement444444444444444',
            },
          },
        ],
      },
    ],
  };
}

function createFakeRpc(blocks) {
  const byHeight = new Map(blocks.map((block) => [block.height, block]));
  const byHash = new Map(blocks.map((block) => [block.hash, block]));

  return {
    async call(method, params = []) {
      if (method === 'getblockcount') {
        return 2;
      }

      if (method === 'getblockhash') {
        const block = byHeight.get(Number(params[0]));
        if (!block) {
          throw new Error(`Missing fake block at height ${params[0]}`);
        }

        return block.hash;
      }

      if (method === 'getblock') {
        const block = byHash.get(params[0]);
        if (!block) {
          throw new Error(`Missing fake block ${params[0]}`);
        }

        return block;
      }

      throw new Error(`Unsupported fake RPC method: ${method}`);
    },
  };
}

function getState(db) {
  return {
    blocks: db
      .prepare(
        `
			SELECT height, hash
			FROM blocks
			WHERE chain_id = 'vrc'
			ORDER BY height
		`
      )
      .all(),
    balances: db
      .prepare(
        `
			SELECT address, balance_sats, total_received_sats, total_sent_sats, tx_count
			FROM address_balances
			WHERE chain_id = 'vrc'
			ORDER BY address
		`
      )
      .all(),
  };
}

function bigintReplacer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}
