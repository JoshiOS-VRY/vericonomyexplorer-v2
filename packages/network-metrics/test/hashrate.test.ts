import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VRM_POW_WORK_FACTOR,
  VRM_TARGET_BLOCK_TIME_SEC,
  blocksPerHourToSpacingSec,
  difficultySpacingToHashPerSec,
  difficultyToHashPerSec,
  formatNetworkHashrateKhPerMin,
  formatNetworkHashrateFromHps,
  hashPerSecToKhPerMin,
  meanBlockSpacingSec,
  normalizeMiningInfoHashrate,
  resolveNetworkHashPerSec,
} from "../src/index.js";

describe("hashPerSecToKhPerMin", () => {
  it("converts H/s to kH/min", () => {
    assert.equal(hashPerSecToKhPerMin(1219.5), 73.17);
  });
});

describe("meanBlockSpacingSec", () => {
  it("computes mean spacing with floor", () => {
    assert.equal(meanBlockSpacingSec(1_000, 4_600, 12), 300);
    assert.equal(meanBlockSpacingSec(1_000, 1_010, 12), 30);
  });
});

describe("blocksPerHourToSpacingSec", () => {
  it("derives spacing from hourly block rate", () => {
    assert.equal(blocksPerHourToSpacingSec(12), 300);
    assert.equal(blocksPerHourToSpacingSec(5), null);
  });
});

describe("difficultySpacingToHashPerSec", () => {
  it("uses Verium scrypt² work factor", () => {
    const difficulty = 0.0000852;
    const spacing = 300;
    const hashPerSec = difficultySpacingToHashPerSec(difficulty, spacing)!;
    assert.equal(hashPerSec, (difficulty * VRM_POW_WORK_FACTOR) / spacing);
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

  it("reads legacy nethashrate RPC key", () => {
    const r = normalizeMiningInfoHashrate({ "nethashrate (kH/m)": 73.17 });
    assert.ok(r.hashPerSec != null && Math.abs(r.hashPerSec - 1219.5) < 0.01);
  });
});

describe("resolveNetworkHashPerSec", () => {
  const difficulty = 0.0000852;
  const spacingSec = 300;
  const measuredHps = difficultySpacingToHashPerSec(difficulty, spacingSec)!;
  const difficultyHps = difficultyToHashPerSec(difficulty, VRM_TARGET_BLOCK_TIME_SEC)!;

  it("prefers recent block spacing over networkhashps", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: { networkhashps: 9999 },
      difficulty,
      recentSpacingSec: spacingSec,
    });
    assert.equal(r.source, "recent_blocks");
    assert.equal(r.hashPerSec, measuredHps);
  });

  it("uses blocks per hour when spacing is unavailable", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: { networkhashps: 9999 },
      difficulty,
      blocksPerHour: 12,
    });
    assert.equal(r.source, "blocks_per_hour");
    assert.equal(r.hashPerSec, measuredHps);
  });

  it("falls back to networkhashps", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: { networkhashps: 1219.5 },
      difficulty,
    });
    assert.equal(r.source, "networkhashps");
    assert.equal(r.hashPerSec, 1219.5);
    assert.equal(r.hashrateKhPerMin, 73.17);
  });

  it("falls back to difficulty at target spacing", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: {},
      difficulty,
    });
    assert.equal(r.source, "difficulty");
    assert.equal(r.hashPerSec, difficultyHps);
  });

  it("uses extended spacing before node fallback", () => {
    const r = resolveNetworkHashPerSec({
      miningInfo: { networkhashps: 9999 },
      difficulty,
      extendedSpacingSec: spacingSec,
    });
    assert.equal(r.source, "recent_blocks_extended");
    assert.equal(r.hashPerSec, measuredHps);
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
