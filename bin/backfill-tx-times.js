#!/usr/bin/env node
'use strict';

require('../app/indexerV2/loadEnv.js');

const dbModule = require('../app/indexerV2/db.js');

const chainArg = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;
const chains = chainArg ? [chainArg] : ['vrm', 'vrc'];

const db = dbModule.openDatabase(undefined, {
  skipSeed: true,
  busyTimeoutMs: 120_000,
});

const update = db.prepare(`
	UPDATE transactions
	SET time = (
		SELECT b.time
		FROM blocks b
		WHERE b.chain_id = transactions.chain_id
			AND b.height = transactions.block_height
	)
	WHERE chain_id = ?
		AND (time IS NULL OR time = 0)
		AND EXISTS (
			SELECT 1 FROM blocks b
			WHERE b.chain_id = transactions.chain_id
				AND b.height = transactions.block_height
				AND b.time > 0
		)
`);

const results = chains.map((chainId) => {
  const info = update.run(chainId);
  return { chainId, repaired: info.changes };
});

console.log(JSON.stringify(results, null, 2));
dbModule.closeDatabase();
