'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeRpcConfirmations, buildRpcBlockResult } = require('../rpcLiveEntities.js');

describe('rpcLiveEntities', () => {
  it('computes confirmations from live tip height', () => {
    assert.equal(computeRpcConfirmations(1099154, 1099154), 1);
    assert.equal(computeRpcConfirmations(1099156, 1099154), 3);
    assert.equal(computeRpcConfirmations(null, 100), 1);
  });

  it('builds complete block totals from decoded transactions', () => {
    const result = buildRpcBlockResult(
      'vrm',
      {
        height: 100,
        hash: 'abc',
        time: 1_700_000_000,
        tx: [
          {
            txid: 'coinbase',
            vin: [{ coinbase: '00', sequence: 4294967295 }],
            vout: [
              { value: 1.5, n: 0, scriptPubKey: { address: 'VTest123456789012345678901234' } },
            ],
          },
        ],
      },
      {
        limit: 25,
        offset: 0,
        tipHeight: 100,
      }
    );

    assert.equal(result.found, true);
    assert.equal(result.confirmations, 1);
    assert.equal(result.totals.outputValue.amount, '1.5');
    assert.equal(result.transactions[0].summary.outputCount, 1);
  });
});
