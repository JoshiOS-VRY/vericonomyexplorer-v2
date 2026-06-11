'use strict';

const { createRpcClient } = require('/app/app/indexerV2/rpcClient.js');
const { getVoutAddresses } = require('/app/app/indexerV2/valueUtils.js');

const ADDR = process.argv[2] || 'VEeDxDJbnVNUuWAZCyoqdVDW6iq3bma176';
const FROM = Number(process.argv[3] || 1100480);
const TO = Number(process.argv[4] || 1100548);

const client = createRpcClient({
  host: process.env.VCEXP_VRM_RPC_HOST || '172.19.0.1',
  port: Number(process.env.VCEXP_VRM_RPC_PORT || 33987),
  username: process.env.VCEXP_VRM_RPC_USER,
  password: process.env.VCEXP_VRM_RPC_PASS,
  timeout: 120000,
});

(async () => {
  let hits = 0;
  let missingAddrExtract = 0;

  for (let height = FROM; height <= TO; height++) {
    const hash = await client.call('getblockhash', [height]);
    const block = await client.call('getblock', [hash, 2]);
    const txs = Array.isArray(block.tx) ? block.tx : [];
    const coinbase = txs[0];
    if (!coinbase || !Array.isArray(coinbase.vout)) {
      continue;
    }

    for (const vout of coinbase.vout) {
      const addrs = getVoutAddresses(vout);
      const inRpc = addrs.includes(ADDR);
      const spk = vout.scriptPubKey || {};
      const mentions = JSON.stringify(spk).includes('2bb01c408642bde2d118bb640f2e48e243544482');
      if (!inRpc && !mentions) {
        continue;
      }

      hits++;
      if (!inRpc && mentions) {
        missingAddrExtract++;
      }

      process.stdout.write(
        `${JSON.stringify({
          height,
          txid: coinbase.txid,
          n: vout.n,
          value: vout.value,
          extractedAddresses: addrs,
          type: spk.type,
          hasAddressField: !!spk.address,
        })}\n`
      );
    }
  }

  process.stdout.write(`${JSON.stringify({ hits, missingAddrExtract, from: FROM, to: TO })}\n`);
})().catch((e) => {
  process.stderr.write(`${e.message}\n`);
  process.exit(1);
});
