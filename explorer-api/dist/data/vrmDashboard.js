import { runIndexerQuery } from "../db/queryPool.js";
import { enrichChainSummary } from "./liveEnrichment.js";
const skipOpts = {
    skipLiveBlocks: true,
    skipLiveRpc: true,
    skipBlockEnrichment: true,
};
export async function fetchVrmDashboardBundle() {
    const bundle = (await runIndexerQuery("getVrmDashboardBundle", [], skipOpts));
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
