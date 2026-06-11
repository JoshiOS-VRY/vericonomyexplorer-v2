'use strict';

// Bounded write-path test: index a small VRM range into the configured backend.
// Usage: VCEXP_DB_BACKEND=postgres node app/indexerV2/pgIngestTest.js <start> <end>

const { syncRange } = require('./worker.js');

const start = Number(process.argv[2] ?? 286315);
const end = Number(process.argv[3] ?? 286365);

syncRange({
  chain: 'vrm',
  indexOnly: true,
  startHeight: start,
  endHeight: end,
  rpcBatchSize: 25,
  storeRawJson: false,
})
  .then((r) => {
    console.log('RESULT', JSON.stringify(r));
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERR', err);
    process.exit(1);
  });
