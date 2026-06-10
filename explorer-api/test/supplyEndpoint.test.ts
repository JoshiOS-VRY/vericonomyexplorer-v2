import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatVrcSupplyResult } from "../src/routes/vrcNetwork.js";
import { formatVrmSupplyResult } from "../src/routes/vrmNetwork.js";

describe("VRM supply endpoint formatting", () => {
  it("formats supply with decimals for CoinGecko-style responses", () => {
    assert.equal(formatVrmSupplyResult(3715286.44121098), "3715286.44121098");
    assert.equal(formatVrmSupplyResult(100), "100");
    assert.equal(formatVrmSupplyResult(0.5), "0.5");
  });

  it("rejects invalid supply values", () => {
    assert.throws(() => formatVrmSupplyResult(Number.NaN), /invalid supply/);
    assert.throws(() => formatVrmSupplyResult(-1), /invalid supply/);
  });
});

describe("VRC supply endpoint formatting", () => {
  it("formats supply with decimals for CoinGecko-style responses", () => {
    assert.equal(formatVrcSupplyResult(3715286.44121098), "3715286.44121098");
    assert.equal(formatVrcSupplyResult(100), "100");
    assert.equal(formatVrcSupplyResult(0.5), "0.5");
  });

  it("rejects invalid supply values", () => {
    assert.throws(() => formatVrcSupplyResult(Number.NaN), /invalid supply/);
    assert.throws(() => formatVrcSupplyResult(-1), /invalid supply/);
  });
});
