#!/usr/bin/env node
'use strict';

require('../app/indexerV2/loadEnv.js');

const dbModule = require('../app/indexerV2/db.js');

const db = dbModule.openDatabase();
const beforeMb = dbModule.getWalSizeMb();
const checkpoint = dbModule.maybeCheckpointWal(db, { force: true });
const afterMb = dbModule.getWalSizeMb();

console.log(
  JSON.stringify(
    {
      ok: true,
      database: dbModule.getDatabasePath(),
      walSizeMbBefore: beforeMb,
      walSizeMbAfter: afterMb,
      checkpoint,
    },
    null,
    2
  )
);

dbModule.closeDatabase();
