import { describe, expect, it } from "@jest/globals";
import {
  chainSummarySchema,
  indexerHealthSchema,
  leaderboardSchema,
  richlistSchema,
} from "@/lib/api/schemas";

const chainHealthFixture = {
  id: "vrm",
  ticker: "VRM",
  name: "Verium",
  consensus: "PoWT",
  status: "syncing",
  trusted: false,
  trustLevel: "historical",
  message: "Historical balances are internally consistent, but the index is still catching up.",
  reasons: ["Indexer is behind the RPC tip."],
  checks: {
    hasBlocks: true,
    startsAtGenesis: true,
    noHeightGaps: true,
    noUnresolvedSpends: true,
    hasRpcTip: true,
    nearTip: false,
    consistentTip: true,
  },
  heights: {
    bestRpcHeight: 1097406,
    minIndexedHeight: 0,
    maxIndexedHeight: 12310,
    lastIndexedHeight: 12310,
    blocksBehind: 1085096,
    tipThreshold: 10,
  },
  counts: {
    indexedBlockCount: 12311,
    expectedBlockCount: 12311,
    gapCount: 0,
    unresolvedSpendCount: 0,
    addressCount: 3416,
  },
  syncState: {
    status: "indexed",
    statusMessage: null,
    updatedAt: 1779569848111,
    lastIndexedHash: "f9c71d991a8f6966a230dbb75cbecb5897346f218fb3eb277498c20a8cd5f807",
  },
  sourceLabels: {
    blocks: "rpc+index",
    transactions: "index-required",
    addressBalances: "partial-index",
    richlist: "disabled-until-trusted",
    leaderboards: "disabled-until-trusted",
  },
};

describe("indexer API schemas", () => {
  it("accepts /api/indexer/status payload", () => {
    expect(
      indexerHealthSchema.parse({
        path: "database/vericonomy-index.sqlite",
        generatedAt: Date.now(),
        tipThreshold: 10,
        chains: [chainHealthFixture],
      }),
    ).toBeTruthy();
  });

  it("accepts /api/indexer/vrm/summary payload", () => {
    expect(
      chainSummarySchema.parse({
        chainId: "vrm",
        health: chainHealthFixture,
        latestBlocks: [
          {
            height: 12301,
            hash: "08fd411e3a16116a845cd361900707b3001efada858f47a17ef0100e9445eef1",
            time: 1475859814,
            txCount: 1,
          },
        ],
        recentTransactions: [],
        source: {
          label: "rpc+index",
          trustLevel: "historical",
          healthStatus: "syncing",
          message: "Historical balances are internally consistent, but the index is still catching up.",
        },
      }),
    ).toBeTruthy();
  });

  it("accepts disabled richlist payload", () => {
    expect(
      richlistSchema.parse({
        chainId: "vrm",
        enabled: false,
        trusted: false,
        message: "richlist is disabled until this chain is indexed from genesis, internally consistent, and near tip.",
        source: {
          label: "disabled-until-trusted",
          trustLevel: "historical",
          healthStatus: "syncing",
          message: "Historical balances are internally consistent, but the index is still catching up.",
        },
        health: chainHealthFixture,
      }),
    ).toEqual(expect.objectContaining({ items: [] }));
  });

  it("accepts disabled leaderboard payload", () => {
    expect(
      leaderboardSchema.parse({
        chainId: "vrm",
        enabled: false,
        trusted: false,
        message: "leaderboards is disabled until this chain is indexed from genesis, internally consistent, and near tip.",
        source: {
          label: "disabled-until-trusted",
          trustLevel: "historical",
          healthStatus: "syncing",
          message: "Historical balances are internally consistent, but the index is still catching up.",
        },
        health: chainHealthFixture,
      }),
    ).toEqual(expect.objectContaining({ items: [] }));
  });
});
