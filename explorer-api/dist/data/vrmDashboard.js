import { runIndexerQuery } from "../db/queryPool.js";
import { enrichChainSummary } from "./liveEnrichment.js";
async function fetchVrmDashboardIndexed() {
    const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
    const vrmHealth = await runIndexerQuery("getChainHealth", ["vrm"], {});
    const queryOpts = { ...skipOpts, chainHealth: vrmHealth };
    const [summary, richlist, leaderboard, miners] = await Promise.all([
        runIndexerQuery("getChainSummaryIndexed", ["vrm"], queryOpts),
        runIndexerQuery("getRichlist", ["vrm"], {
            limit: 5,
            chainHealth: vrmHealth,
        }),
        runIndexerQuery("getLeaderboard", ["vrm"], {
            period: "month",
            sort: "activity",
            limit: 5,
            chainHealth: vrmHealth,
        }),
        runIndexerQuery("getMinedLeaderboard", ["vrm"], {
            period: "month",
            limit: 5,
            chainHealth: vrmHealth,
        }),
    ]);
    return { summary, richlist, leaderboard, miners };
}
export async function fetchVrmDashboardBundle() {
    const indexed = await fetchVrmDashboardIndexed();
    const summary = await enrichChainSummary(indexed.summary, "vrm", {
        skipLiveBlocks: true,
        skipLiveRpc: true,
    });
    return {
        summary,
        richlist: indexed.richlist,
        leaderboard: indexed.leaderboard,
        miners: indexed.miners,
        fetchedAt: new Date().toISOString(),
    };
}
