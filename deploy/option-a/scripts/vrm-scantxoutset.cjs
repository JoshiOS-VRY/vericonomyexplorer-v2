'use strict';

const { createRpcClient } = require('/app/app/indexerV2/rpcClient.js');

const ADDR = process.argv[2] || 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176';
const client = createRpcClient({
  host: process.env.VCEXP_VRM_RPC_HOST || '172.19.0.1',
  port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
  username: process.env.VCEXP_VRM_RPC_USER,
  password: process.env.VCEXP_VRM_RPC_PASS,
  timeout: 300000,
});

(async () => {
  const tip = await client.call('getblockcount');
  console.log(JSON.stringify({ tip }));

  const started = await client.call('scantxoutset', ['start', [`addr(${ADDR})`]]);
  console.log(JSON.stringify({ started }));

  const scan = await client.call('scantxoutset', ['scan']);
  const totalSats = Math.round(Number(scan.total_amount || 0) * 1e8);
  console.log(
    JSON.stringify({
      success: scan.success,
      txouts: scan.txouts,
      total_amount: scan.total_amount,
      total_sats: totalSats,
      height: scan.height,
    })
  );
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
