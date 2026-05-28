import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { runIndexerQuery } from "../db/queryPool.js";
import { fetchVrmNetworkStats } from "../network/index.js";
import { enrichChainSummary } from "./liveEnrichment.js";
const emptyVrmNetwork = () => ({
    hashrateKhPerMin: null,
    hashrate7dKhPerMin: null,
    difficulty: null,
    blocks: null,
    supply: null,
    maxSupply: null,
});
const emptyActivityHistory = () => ({
    chainId: "vrm",
    trusted: false,
    source: { label: "unavailable", type: "index" },
    since: null,
    categories: [],
    backfillRequired: true,
    buckets: [],
});
async function fetchVrmDashboardIndexed() {
    const skipLiveBlocks = { skipLiveBlocks: true };
    const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;
    const [summary, richlist, leaderboard, activityHistory] = await Promise.all([
        runIndexerQuery("getChainSummaryIndexed", ["vrm"], skipLiveBlocks),
        runIndexerQuery("getRichlist", ["vrm"], { limit: 5 }),
        runIndexerQuery("getLeaderboard", ["vrm"], {
            period: "month",
            sort: "activity",
            limit: 5,
        }),
        runIndexerQuery("getChainActivityHistory", ["vrm"], {
            since: since30d,
            maxPoints: 100,
        }).catch(() => emptyActivityHistory()),
    ]);
    return { summary, richlist, leaderboard, activityHistory };
}
function applySupplyMcap(market, supply) {
    if (market.marketCap != null || market.usd == null || supply == null) {
        return market;
    }
    return {
        ...market,
        marketCap: market.usd * supply,
        source: market.source === "unavailable" ? "computed" : market.source,
    };
}
export async function fetchVrmDashboardBundle() {
    const [indexed, network, marketPayload] = await Promise.all([
        fetchVrmDashboardIndexed(),
        fetchVrmNetworkStats().catch(emptyVrmNetwork),
        fetchHomeMarket(null, null).catch(() => ({
            vrm: emptyMarket(),
            vrc: emptyMarket(),
            fetchedAt: new Date().toISOString(),
        })),
    ]);
    const summary = await enrichChainSummary(indexed.summary, "vrm", { skipLiveBlocks: true });
    const market = applySupplyMcap(marketPayload.vrm, network.supply);
    return {
        summary,
        richlist: indexed.richlist,
        leaderboard: indexed.leaderboard,
        network,
        market,
        activityHistory: indexed.activityHistory,
        fetchedAt: new Date().toISOString(),
    };
}
