import {
  getChainSyncLabel,
  isChainAtTip,
  mergeChainHealth,
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

  it("is live when blocksBehind is within the tip threshold", () => {
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

    expect(isChainAtTip(health, 100)).toBe(true);
    expect(getChainSyncLabel(health, 100)).toBe("Live");
  });

  it("is offline when blocksBehind exceeds the tip threshold", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 115,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 15,
      },
      explorerStatus: {
        label: "Updating",
        message: "15 blocks behind the latest block.",
        syncing: true,
        blocksBehind: 15,
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

  it("is live when indexed tip is within threshold of rpc tip", () => {
    const health = baseHealth({
      heights: {
        bestRpcHeight: 105,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: null,
      },
    });

    expect(isChainAtTip(health, 100)).toBe(true);
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

describe("mergeChainHealth", () => {
  it("preserves live rpc height and near-tip status across stale poll responses", () => {
    const prev = baseHealth({
      checks: {
        nearTip: true,
        hasRpcTip: true,
      },
      heights: {
        bestRpcHeight: 100,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: 0,
        tipThreshold: 10,
      },
      explorerStatus: {
        label: "Live",
        message: "Up to date.",
        syncing: false,
        blocksBehind: 0,
      },
    });
    const next = baseHealth({
      checks: {
        nearTip: false,
        hasRpcTip: false,
      },
      heights: {
        bestRpcHeight: null,
        minIndexedHeight: 0,
        maxIndexedHeight: 100,
        lastIndexedHeight: 100,
        blocksBehind: null,
        tipThreshold: 10,
      },
      explorerStatus: {
        label: "Offline",
        message: "Unable to reach the chain node.",
        syncing: false,
      },
    });

    const merged = mergeChainHealth(prev, next, 100);

    expect(merged.heights.bestRpcHeight).toBe(100);
    expect(merged.checks?.nearTip).toBe(true);
    expect(merged.explorerStatus?.label).toBe("Live");
    expect(isChainAtTip(merged, 100, 100)).toBe(true);
  });
});
