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
  const unspent = await client.call('listunspent', [0, 9999999, [ADDR]]);
  const utxoSumSats = unspent.reduce((t, r) => t + Math.round(Number(r.amount || 0) * 1e8), 0);
  console.log(
    JSON.stringify(
      {
        address: ADDR,
        listunspentCount: unspent.length,
        listunspentSumSats: utxoSumSats,
        listunspentSumCoins: utxoSumSats / 1e8,
      },
      null,
      2
    )
  );
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
