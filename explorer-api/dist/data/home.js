import { fetchHomeMarket } from "../market/index.js";
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
    const [shell, network, market] = await Promise.all([
        fetchHomeShell(),
        fetchHomeNetwork(),
        fetchHomeMarketOnly(),
    ]);
    const vrmMarket = applySupplyMcap(market.vrm, network.vrm.supply);
    const vrcMarket = applySupplyMcap(market.vrc, network.vrc.supply);
    return {
        vrm: {
            summary: shell.vrm.summary,
            richlist: shell.vrm.richlist,
            market: vrmMarket,
            network: network.vrm,
        },
        vrc: {
            summary: shell.vrc.summary,
            richlist: shell.vrc.richlist,
            market: vrcMarket,
            network: network.vrc,
        },
        vrmLeaderboard: shell.vrmLeaderboard,
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
