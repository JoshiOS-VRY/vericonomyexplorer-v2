'use strict';

const assert = require('assert');
const utils = require('../../utils.js');
const {
  chainIdToTicker,
  getMiningPoolConfigs,
  loadAllMiningPoolConfigs,
  mapMinerFields,
  resolveMinerLink,
} = require('../miningPoolConfigs.js');

loadAllMiningPoolConfigs();

assert.equal(chainIdToTicker('vrm'), 'VRM');

const vrmConfigs = getMiningPoolConfigs('VRM');
assert.ok(vrmConfigs.length > 0, 'VRM mining pool configs should load');

assert.equal(resolveMinerLink('Verium Pool', null, 'VRM'), 'https://pool.vericonomy.com');

const poolTagCoinbase = {
  blockhash: 'abc123',
  vin: [{ coinbase: Buffer.from('/VRMPOOL/', 'utf8').toString('hex') }],
  vout: [
    {
      value: 50,
      scriptPubKey: { address: 'VRq98Nm2P6anLHPgnHdb6NnibJ6GoG3Jm9' },
    },
  ],
};

const taggedMiner = utils.identifyMiner(poolTagCoinbase, 100, 'VRM');
assert.ok(taggedMiner, 'coinbase tag should identify pool');
assert.equal(taggedMiner.name, 'Verium Pool');

const mapped = mapMinerFields(taggedMiner);
assert.equal(mapped.extractedBy, 'Verium Pool');
assert.equal(mapped.extractedByAddress, null);

const payoutOnlyCoinbase = {
  blockhash: 'def456',
  vin: [{ coinbase: '00' }],
  vout: [
    {
      value: 50,
      scriptPubKey: { address: 'VRq98Nm2P6anLHPgnHdb6NnibJ6GoG3Jm9' },
    },
  ],
};

const payoutMiner = utils.identifyMiner(payoutOnlyCoinbase, 101, 'VRM');
assert.ok(payoutMiner, 'payout address should identify pool');
assert.equal(payoutMiner.name, 'Verium Pool');

console.log('miningPoolConfigs tests passed');
