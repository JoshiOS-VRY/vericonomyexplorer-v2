'use strict';

const { createRpcClient } = require('/app/app/indexerV2/rpcClient.js');

const ADDR = process.argv[2] || 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176';

const client = createRpcClient({
  host: process.env.VCEXP_VRM_RPC_HOST || '172.19.0.1',
  port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
  username: process.env.VCEXP_VRM_RPC_USER,
  password: process.env.VCEXP_VRM_RPC_PASS,
  timeout: 120000,
});

(async () => {
  const out = { address: ADDR };
  try {
    out.receivedByAddress = await client.call('getreceivedbyaddress', [ADDR, 0]);
  } catch (error) {
    out.receivedByAddressError = error.message;
  }
  try {
    const unspent = await client.call('listunspent', [0, 9999999, [ADDR]]);
    out.listunspentCount = unspent.length;
    out.listunspentSum = unspent.reduce((t, row) => t + Number(row.amount || 0), 0);
  } catch (error) {
    out.listunspentError = error.message;
  }
  try {
    out.addressInfo = await client.call('getaddressinfo', [ADDR]);
  } catch (error) {
    out.addressInfoError = error.message;
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
