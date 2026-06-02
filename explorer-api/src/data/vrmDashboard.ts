import { runIndexerQuery } from "../db/queryPool.js";
import { enrichChainSummary } from "./liveEnrichment.js";

const skipOpts = {
  skipLiveBlocks: true,
  skipLiveRpc: true,
  skipBlockEnrichment: true,
};

type VrmDashboardBundle = {
  summary: Record<string, unknown>;
  richlist: Record<string, unknown>;
  leaderboard: Record<string, unknown>;
  miners: Record<string, unknown>;
  activityHistory?: Record<string, unknown>;
};

export async function fetchVrmDashboardBundle() {
  const bundle = (await runIndexerQuery<VrmDashboardBundle>(
    "getVrmDashboardBundle",
    [],
    skipOpts,
  )) as VrmDashboardBundle;

  const summary = await enrichChainSummary(bundle.summary, "vrm", skipOpts);

  return {
    summary,
    richlist: bundle.richlist,
    leaderboard: bundle.leaderboard,
    miners: bundle.miners,
    activityHistory: bundle.activityHistory,
    fetchedAt: new Date().toISOString(),
  };
}
