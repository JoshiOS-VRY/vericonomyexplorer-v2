import { runIndexerQuery } from "../db/queryPool.js";
import { enrichChainSummary } from "./liveEnrichment.js";
async function fetchVrmDashboardIndexed() {
    const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
    const [summary, richlist, leaderboard] = await Promise.all([
        runIndexerQuery("getChainSummaryIndexed", ["vrm"], skipOpts),
        runIndexerQuery("getRichlist", ["vrm"], { limit: 5 }),
        runIndexerQuery("getLeaderboard", ["vrm"], {
            period: "month",
            sort: "activity",
            limit: 5,
        }),
    ]);
    return { summary, richlist, leaderboard };
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
        fetchedAt: new Date().toISOString(),
    };
}
