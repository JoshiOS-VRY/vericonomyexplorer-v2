import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { fetchVrcNetworkStats, fetchVrmNetworkStats } from "../network/index.js";
import { fetchLandingData } from "./legacy.js";
const emptyVrmNetwork = () => ({
    hashrateKhPerMin: null,
    hashrate7dKhPerMin: null,
    difficulty: null,
    blocks: null,
    supply: null,
    maxSupply: null,
});
const emptyVrcNetwork = () => ({
    difficulty: null,
    blocks: null,
    supply: null,
    maxSupply: null,
    interestRatePercent: null,
    netStakeWeight: null,
    percentStaked: null,
    expectedStakeTimeSeconds: null,
});
export async function fetchHomeShell() {
    const landing = await fetchLandingData();
    return {
        vrm: {
            summary: landing.vrmSummary,
            richlist: landing.vrmRichlist,
        },
        vrc: {
            summary: landing.vrcSummary,
            richlist: landing.vrcRichlist,
        },
        vrmLeaderboard: landing.vrmLeaderboard,
        fetchedAt: new Date().toISOString(),
    };
}
export async function fetchHomeNetwork() {
    const [vrmNetwork, vrcNetwork] = await Promise.all([
        fetchVrmNetworkStats().catch(emptyVrmNetwork),
        fetchVrcNetworkStats().catch(emptyVrcNetwork),
    ]);
    return {
        vrm: vrmNetwork,
        vrc: vrcNetwork,
        fetchedAt: new Date().toISOString(),
    };
}
export async function fetchHomeData() {
    const [landing, vrmNetwork, vrcNetwork, market] = await Promise.all([
        fetchLandingData(),
        fetchVrmNetworkStats().catch(emptyVrmNetwork),
        fetchVrcNetworkStats().catch(emptyVrcNetwork),
        fetchHomeMarket(null, null).catch(() => ({
            vrm: emptyMarket(),
            vrc: emptyMarket(),
            fetchedAt: new Date().toISOString(),
        })),
    ]);
    const vrmMarket = applySupplyMcap(market.vrm, vrmNetwork.supply);
    const vrcMarket = applySupplyMcap(market.vrc, vrcNetwork.supply);
    return {
        vrm: {
            summary: landing.vrmSummary,
            richlist: landing.vrmRichlist,
            market: vrmMarket,
            network: vrmNetwork,
        },
        vrc: {
            summary: landing.vrcSummary,
            richlist: landing.vrcRichlist,
            market: vrcMarket,
            network: vrcNetwork,
        },
        vrmLeaderboard: landing.vrmLeaderboard,
        fetchedAt: new Date().toISOString(),
    };
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
export async function fetchHomeMarketOnly() {
    return fetchHomeMarket(null, null);
}
