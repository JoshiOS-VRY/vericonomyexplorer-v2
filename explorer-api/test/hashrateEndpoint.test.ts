import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveNetworkHashPerSec,
  difficultySpacingToHashPerSec,
} from '@vericonomy/network-metrics';

/**
 * Home network and /v1/vrm/network/hashrate share the same resolver inputs.
 */
describe('home vs hashrate endpoint parity', () => {
  it('returns identical hashrateKhPerMin for the same RPC inputs', () => {
    const difficulty = 0.0000852;
    const recentSpacingSec = 300;
    const miningInfo = { networkhashps: 1219.5, blocksperhour: 12 };

    const homeResolved = resolveNetworkHashPerSec({ miningInfo, difficulty, recentSpacingSec });
    const endpointResolved = resolveNetworkHashPerSec({
      miningInfo,
      difficulty,
      recentSpacingSec,
      blocksPerHour: 12,
      extendedSpacingSec: 310,
    });

    const expectedHps = difficultySpacingToHashPerSec(difficulty, recentSpacingSec)!;

    assert.equal(homeResolved.hashrateKhPerMin, endpointResolved.hashrateKhPerMin);
    assert.equal(homeResolved.hashPerSec, endpointResolved.hashPerSec);
    assert.equal(homeResolved.source, 'recent_blocks');
    assert.equal(homeResolved.hashPerSec, expectedHps);
  });
});
