import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VERIUM_POOL_DISPLAY_NAME,
  VERIUM_POOL_PAYOUT_ADDRESS,
  resolveWalletMinerAddress,
} from "../src/data/veriumPool.js";

describe("resolveWalletMinerAddress", () => {
  it("prefers extractedByAddress", () => {
    assert.equal(
      resolveWalletMinerAddress(
        VERIUM_POOL_DISPLAY_NAME,
        VERIUM_POOL_PAYOUT_ADDRESS,
      ),
      VERIUM_POOL_PAYOUT_ADDRESS,
    );
  });

  it("maps Verium Pool label to payout address", () => {
    assert.equal(
      resolveWalletMinerAddress(VERIUM_POOL_DISPLAY_NAME, null),
      VERIUM_POOL_PAYOUT_ADDRESS,
    );
  });

  it("passes through valid Verium addresses from extractedBy", () => {
    const addr = "VLZEz6CBem7XpqbEm9tik9rLi7uQggccu5";
    assert.equal(resolveWalletMinerAddress(addr, null), addr);
  });

  it("does not use arbitrary labels as addresses", () => {
    assert.equal(resolveWalletMinerAddress("Some Miner", null), null);
  });
});
