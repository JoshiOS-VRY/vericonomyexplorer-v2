#!/usr/bin/env node
'use strict';

require('../app/indexerV2/loadEnv.js');

const health = require('../app/indexerV2/health.js');
const dbModule = require('../app/indexerV2/db.js');

try {
  const status = health.getIndexerHealth({
    tipThreshold: process.env.VCEXP_INDEXER_TIP_THRESHOLD,
  });

  console.log(JSON.stringify(status, null, 2));
  dbModule.closeDatabase();
} catch (err) {
  console.error(err.stack || err.message);
  dbModule.closeDatabase();
  process.exit(1);
}
