'use strict';

module.exports = [
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000001',
    height: 1,
    time: 1700000000,
    size: 1000,
    difficulty: 1,
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000000',
    tx: [
      {
        txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        vin: [{ coinbase: '01' }],
        vout: [
          {
            value: 50,
            n: 0,
            scriptPubKey: {
              type: 'pubkeyhash',
              address: 'VAddressReceive111111111111111111111',
            },
          },
        ],
      },
    ],
  },
  {
    hash: '0000000000000000000000000000000000000000000000000000000000000002',
    height: 2,
    time: 1700000060,
    size: 1000,
    difficulty: 1,
    previousblockhash: '0000000000000000000000000000000000000000000000000000000000000001',
    tx: [
      {
        txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        vin: [
          {
            txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            vout: 0,
          },
        ],
        vout: [
          {
            value: 12.5,
            n: 0,
            scriptPubKey: {
              type: 'pubkeyhash',
              address: 'VAddressChange222222222222222222222',
            },
          },
          {
            value: 37.4999,
            n: 1,
            scriptPubKey: {
              type: 'pubkeyhash',
              address: 'VAddressReceive333333333333333333',
            },
          },
        ],
      },
    ],
  },
];
