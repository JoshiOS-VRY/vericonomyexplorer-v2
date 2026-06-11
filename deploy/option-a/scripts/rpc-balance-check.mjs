import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const rpc = require('/app/app/indexerV2/rpcClient.js');

const chain = process.argv[2] || 'vrc';
const address = process.argv[3];
if (!address) {
  console.error('usage: node rpc-balance-check.mjs <vrc|vrm> <address>');
  process.exit(1);
}

const unspent = await rpc.call(chain, 'listunspent', 0, 9_999_999, [address]);
const utxoSum = unspent.reduce((total, row) => total + Number(row.amount || 0), 0);
console.log(
  JSON.stringify({ chain, address, listunspentCount: unspent.length, listunspentSum: utxoSum })
);

try {
  const bal = await rpc.call(chain, 'getaddressbalance', { addresses: [address] });
  console.log(JSON.stringify({ getaddressbalance: bal }));
} catch (error) {
  console.log(JSON.stringify({ getaddressbalanceError: error.message }));
}
