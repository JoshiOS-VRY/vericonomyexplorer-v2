import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNetworkHashPerSec } from "@vericonomy/network-metrics";

/**
 * Home network and /v1/vrm/network/hashrate share the same resolver inputs.
 * This test locks parity for a representative RPC fixture.
 */
describe("home vs hashrate endpoint parity", () => {
  it("returns identical hashrateKhPerMin for the same RPC inputs", () => {
    const miningInfo = { networkhashps: 1219.5 };
    const difficulty = 0.0000852;

    const homeResolved = resolveNetworkHashPerSec({ miningInfo, difficulty });
    const endpointResolved = resolveNetworkHashPerSec({
      miningInfo,
      hashrate1d: 9999,
      hashrate7d: 8888,
      difficulty,
    });

    assert.equal(homeResolved.hashrateKhPerMin, endpointResolved.hashrateKhPerMin);
    assert.equal(homeResolved.hashPerSec, endpointResolved.hashPerSec);
    assert.equal(homeResolved.source, "networkhashps");
    assert.equal(homeResolved.hashrateKhPerMin, 73.17);
  });
});
