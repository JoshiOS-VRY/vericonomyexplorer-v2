'use strict';

const { createRpcClient } = require('/app/app/indexerV2/rpcClient.js');

const client = createRpcClient({
  host: process.env.VCEXP_VRM_RPC_HOST || '172.19.0.1',
  port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
  username: process.env.VCEXP_VRM_RPC_USER,
  password: process.env.VCEXP_VRM_RPC_PASS,
  timeout: 120000,
});

const checks = [
  ['3ec4ff9c36e6e72275890941214e92c89302b7591174cfe6bb71014e070f7834', 0],
  ['2a1ac73058b2b80981c0b16998a5ccfb87f500ebc5ff508958cdf4919578cb21', 1],
  ['93fd27c5f3fccf7de1e3e8dab12e52991b3f6e4ee0e30ae6ae2f718f811f98fb', 0],
];

(async () => {
  const addr = 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176';
  console.log(JSON.stringify({ validateaddress: await client.call('validateaddress', [addr]) }));

  for (const [txid, n] of checks) {
    const out = await client.call('gettxout', [txid, n]);
    console.log(JSON.stringify({ txid, n, gettxout: out }));
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
