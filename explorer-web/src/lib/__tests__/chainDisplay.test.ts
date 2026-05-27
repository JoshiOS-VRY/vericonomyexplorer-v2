import {
  getChainSyncLabel,
  isChainAtTip,
} from "@/lib/chainDisplay";
import type { ChainHealth } from "@/lib/api/types";

function baseHealth(overrides: Partial<ChainHealth> = {}): ChainHealth {
  return {
    id: "vrm",
    status: "trusted",
    trusted: true,
    message: "",
    checks: {},
    heights: {
      bestRpcHeight: 100,
      minIndexedHeight: 0,
      maxIndexedHeight: 100,
      lastIndexedHeight: 100,
      blocksBehind: 0,
    },
    counts: {
      indexedBlockCount: 101,
      expectedBlockCount: 101,
      gapCount: 0,
      unresolvedSpendCount: 0,
      addressCount: 1,
    },
    sourceLabels: {},
    explorerStatus: {
      label: "Live",
      message: "Up to date with the chain tip.",
      syncing: false,
      blocksBehind: 0,
    },
    ...overrides,
  };
}

describe("isChainAtTip", () => {
  it("is live when blocksBehind is zero", () => {
    expect(isChainAtTip(baseHealth(), 100)).toBe(true);
    expect(getChainSyncLabel(baseHealth(), 100)).toBe("Live");
  });

  it("is offline when blocksBehind is positive", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 5,
      },
      explorerStatus: {
        label: "Syncing",
        message: "5 blocks behind chain tip.",
        syncing: true,
        blocksBehind: 5,
      },
    });

    expect(isChainAtTip(health, 100)).toBe(false);
    expect(getChainSyncLabel(health, 100)).toBe("Offline");
  });

  it("is offline when latest indexed block height differs from rpc tip", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: null,
      },
    });

    expect(isChainAtTip(health, 100)).toBe(false);
  });

  it("is live when rpc tip comes from the live stream fallback", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: null,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: null,
      },
    });

    expect(isChainAtTip(health, 100, 100)).toBe(true);
    expect(getChainSyncLabel(health, 100, 100)).toBe("Live");
  });

  it("is live when indexed height is at or ahead of rpc tip", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 100,
        minIndexedHeight: 0,
        maxIndexedHeight: 101,
        lastIndexedHeight: 101,
        blocksBehind: null,
      },
    });

    expect(isChainAtTip(health, 101, 100)).toBe(true);
  });
});
