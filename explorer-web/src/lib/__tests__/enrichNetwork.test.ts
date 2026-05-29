import { describe, expect, it } from "@jest/globals";
import {
  enrichHomeNetworkPayload,
  enrichVrmNetworkStats,
  estimateVrmHashrateKhPerMin,
  mergeHomeNetworkPayload,
} from "@/lib/enrichNetwork";
import type { ChainSummary, HomeNetworkPayload } from "@/lib/api/types";

function summaryWithTip(
  chainId: "vrm" | "vrc",
  height: number,
  difficulty: string,
): ChainSummary {
  return {
    chainId,
    health: {
      id: chainId,
      status: "trusted",
      trusted: true,
      message: "",
      checks: {},
      heights: {
        bestRpcHeight: height,
        minIndexedHeight: 0,
        maxIndexedHeight: height,
        lastIndexedHeight: height,
        blocksBehind: 0,
      },
      counts: {
        indexedBlockCount: height + 1,
        expectedBlockCount: height + 1,
        gapCount: 0,
        unresolvedSpendCount: 0,
        addressCount: 1,
      },
      sourceLabels: {},
    },
    latestBlocks: [{ height, hash: "abc", time: 1, txCount: 1, difficulty }],
    recentTransactions: [],
    source: { label: "index" },
  };
}

describe("enrichNetwork", () => {
  it("prefers live tip difficulty and derives VRM hashrate from it", () => {
    const enriched = enrichVrmNetworkStats(
      {
        hashrateKhPerMin: 80,
        hashrate7dKhPerMin: null,
        difficulty: 0.0001,
        blocks: null,
        supply: null,
        maxSupply: null,
      },
      summaryWithTip("vrm", 1098551, "0.00009284"),
    );

    expect(enriched.difficulty).toBeCloseTo(0.00009284);
    expect(enriched.hashrateKhPerMin).toBeCloseTo(
      estimateVrmHashrateKhPerMin(0.00009284),
    );
    expect(enriched.blocks).toBe(1098551);
  });

  it("merges refresh payloads without clobbering prior values", () => {
    const prev: HomeNetworkPayload = {
      fetchedAt: "2026-01-01T00:00:00.000Z",
      vrm: {
        hashrateKhPerMin: 80,
        hashrate7dKhPerMin: null,
        difficulty: 0.0001,
        blocks: 100,
        supply: 3_712_086,
        maxSupply: null,
      },
      vrc: {
        difficulty: null,
        blocks: null,
        supply: null,
        maxSupply: null,
        interestRatePercent: null,
        netStakeWeight: null,
        percentStaked: null,
        expectedStakeTimeSeconds: null,
      },
    };

    const next: HomeNetworkPayload = {
      fetchedAt: "2026-01-01T00:01:00.000Z",
      vrm: {
        hashrateKhPerMin: 92,
        hashrate7dKhPerMin: null,
        difficulty: null,
        blocks: null,
        supply: null,
        maxSupply: null,
      },
      vrc: {
        difficulty: null,
        blocks: null,
        supply: null,
        maxSupply: null,
        interestRatePercent: null,
        netStakeWeight: null,
        percentStaked: null,
        expectedStakeTimeSeconds: null,
      },
    };

    const merged = mergeHomeNetworkPayload(prev, next);

    expect(merged.vrm.hashrateKhPerMin).toBe(92);
    expect(merged.vrm.difficulty).toBe(0.0001);
    expect(merged.vrm.supply).toBe(3_712_086);
  });

  it("enriches both chains in home payload", () => {
    const enriched = enrichHomeNetworkPayload(
      {
        fetchedAt: "2026-01-01T00:00:00.000Z",
        vrm: {
          hashrateKhPerMin: 80,
          hashrate7dKhPerMin: null,
          difficulty: null,
          blocks: null,
          supply: null,
          maxSupply: null,
        },
        vrc: {
          difficulty: null,
          blocks: null,
          supply: null,
          maxSupply: null,
          interestRatePercent: null,
          netStakeWeight: null,
          percentStaked: null,
          expectedStakeTimeSeconds: null,
        },
      },
      summaryWithTip("vrm", 1098551, "0.00009284"),
      summaryWithTip("vrc", 500000, "1234.5"),
    );

    expect(enriched.vrm.difficulty).toBeCloseTo(0.00009284);
    expect(enriched.vrc.difficulty).toBe(1234.5);
  });
});
