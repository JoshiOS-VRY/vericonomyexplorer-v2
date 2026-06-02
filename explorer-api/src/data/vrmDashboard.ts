import { runIndexerQuery } from "../db/queryPool.js";
import { enrichChainSummary } from "./liveEnrichment.js";

async function fetchVrmDashboardIndexed() {
  const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
  const vrmHealth = await runIndexerQuery<Record<string, unknown>>("getChainHealth", ["vrm"], {});
  const queryOpts = { ...skipOpts, chainHealth: vrmHealth };

  const [summary, richlist, leaderboard, miners] = await Promise.all([
    runIndexerQuery<Record<string, unknown>>("getChainSummaryIndexed", ["vrm"], queryOpts),
    runIndexerQuery<Record<string, unknown>>("getRichlist", ["vrm"], {
      limit: 5,
      chainHealth: vrmHealth,
    }),
    runIndexerQuery<Record<string, unknown>>("getLeaderboard", ["vrm"], {
      period: "month",
      sort: "activity",
      limit: 5,
      chainHealth: vrmHealth,
    }),
    runIndexerQuery<Record<string, unknown>>("getMinedLeaderboard", ["vrm"], {
      period: "month",
      limit: 5,
      chainHealth: vrmHealth,
    }),
  ]);

  return { summary, richlist, leaderboard, miners };
}

export async function fetchVrmDashboardBundle() {
  const indexed = await fetchVrmDashboardIndexed();
  // Merge the live chain tip and latest RPC blocks so the dashboard hero and
  // blocks panel reflect the current height on first paint, matching VRC.
  const summary = await enrichChainSummary(indexed.summary, "vrm", {});

  return {
    summary,
    richlist: indexed.richlist,
    leaderboard: indexed.leaderboard,
    miners: indexed.miners,
    fetchedAt: new Date().toISOString(),
  };
}
