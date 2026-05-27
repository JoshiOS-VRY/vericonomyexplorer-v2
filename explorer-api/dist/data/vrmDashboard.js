import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { fetchVrmNetworkStats } from "../network/index.js";
import { enrichChainSummary } from "./liveEnrichment.js";
import { fetchVrmDashboardIndexed } from "./legacy.js";
const emptyVrmNetwork = () => ({
    hashrateKhPerMin: null,
    hashrate7dKhPerMin: null,
    difficulty: null,
    blocks: null,
    supply: null,
    maxSupply: null,
});
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
