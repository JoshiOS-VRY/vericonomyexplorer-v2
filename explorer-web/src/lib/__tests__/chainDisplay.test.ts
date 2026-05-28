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
      message: "Up to date.",
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

  it("is offline when blocksBehind exceeds the tip threshold", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 120,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 20,
      },
      explorerStatus: {
        label: "Updating",
        message: "20 blocks behind the latest block.",
        syncing: true,
        blocksBehind: 20,
      },
    });

    expect(isChainAtTip(health, 100)).toBe(false);
    expect(getChainSyncLabel(health, 100)).toBe("Offline");
  });

  it("is offline when blocksBehind is positive and indexed tip is behind", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 5,
      },
      explorerStatus: {
        label: "Updating",
        message: "5 blocks behind the latest block.",
        syncing: true,
        blocksBehind: 5,
      },
    });

    expect(isChainAtTip(health, 100)).toBe(false);
    expect(getChainSyncLabel(health, 100)).toBe("Offline");
  });

  it("is live when indexed latest block matches tip even if sync_state blocksBehind is stale", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 105,
        lastIndexedHeight: 100,
        blocksBehind: 5,
      },
    });

    expect(isChainAtTip(health, 105)).toBe(true);
    expect(getChainSyncLabel(health, 105)).toBe("Live");
  });

  it("is live when health indexed height is ahead of a stale latest block list", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 1098850,
        minIndexedHeight: 0,
        maxIndexedHeight: 1098850,
        lastIndexedHeight: 1098850,
        blocksBehind: 0,
      },
    });

    expect(isChainAtTip(health, 1098846)).toBe(true);
    expect(getChainSyncLabel(health, 1098846)).toBe("Live");
  });

  it("is live when within the default tip threshold even if block list lags", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 5,
      },
      checks: { nearTip: true },
    });

    expect(isChainAtTip(health, 100)).toBe(true);
    expect(getChainSyncLabel(health, 100)).toBe("Live");
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
