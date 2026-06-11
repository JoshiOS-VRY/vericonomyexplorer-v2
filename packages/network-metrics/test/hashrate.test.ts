import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  difficultyToHashPerSec,
  formatNetworkHashrateKhPerMin,
  formatNetworkHashrateFromHps,
  hashPerSecToKhPerMin,
  normalizeMiningInfoHashrate,
  resolveNetworkHashPerSec,
} from "../src/index.js";

describe("hashPerSecToKhPerMin", () => {
  it("converts H/s to kH/min", () => {
    // 1219.5 H/s ≈ 73.17 kH/m (typical live network)
    assert.equal(hashPerSecToKhPerMin(1219.5), 73.17);
  });
});

describe("normalizeMiningInfoHashrate", () => {
  it("prefers networkhashps as H/s", () => {
    const r = normalizeMiningInfoHashrate({ networkhashps: 1219.5 });
    assert.equal(r.hashPerSec, 1219.5);
    assert.equal(r.source, "networkhashps");
  });

  it("converts nethashrate kH/m to H/s", () => {
    const r = normalizeMiningInfoHashrate({ nethashrate: 73.17 });
    assert.ok(r.hashPerSec != null && Math.abs(r.hashPerSec - 1219.5) < 0.01);
    assert.equal(r.source, "nethashrate");
  });
});

describe("resolveNetworkHashPerSec", () => {
  const difficulty = 0.0000852;
  const difficultyHps = difficultyToHashPerSec(difficulty)!;

  it("uses networkhashps first", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: { networkhashps: 1219.5 },
      hashrate1d: 9999,
      difficulty,
    });
    assert.equal(r.source, "networkhashps");
    assert.equal(r.hashPerSec, 1219.5);
    assert.equal(r.hashrateKhPerMin, 73.17);
  });

  it("falls back to getnetworkhashps 1d", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: {},
      hashrate1d: 1219.5,
      difficulty,
    });
    assert.equal(r.source, "getnetworkhashps");
    assert.equal(r.hashPerSec, 1219.5);
  });

  it("falls back to difficulty", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: {},
      difficulty,
    });
    assert.equal(r.source, "difficulty");
    assert.ok(r.hashPerSec != null && r.hashPerSec > 0);
    assert.equal(r.hashPerSec, difficultyHps);
  });

  it("falls back to 7d scan last", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: {},
      hashrate7d: 1100,
    });
    assert.equal(r.source, "getnetworkhashps");
    assert.equal(r.hashPerSec, 1100);
  });
});

describe("formatNetworkHashrateKhPerMin", () => {
  it("formats typical network rate", () => {
    assert.equal(formatNetworkHashrateKhPerMin(73.17), "73.17 kH/m");
  });

  it("escalates to MH/m", () => {
    assert.equal(formatNetworkHashrateKhPerMin(1500), "1.50 MH/m");
  });

  it("returns dash for invalid", () => {
    assert.equal(formatNetworkHashrateKhPerMin(null), "—");
    assert.equal(formatNetworkHashrateKhPerMin(0), "—");
  });
});

describe("formatNetworkHashrateFromHps", () => {
  it("matches kH/min formatter", () => {
    assert.equal(formatNetworkHashrateFromHps(1219.5), "73.17 kH/m");
  });
});
