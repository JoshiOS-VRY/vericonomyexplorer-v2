import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { fetchVrmNetworkStats } from "../network/index.js";
import type { HomeMarketPayload, VrmNetworkStats } from "../types/home.js";
import {
  fetchChainActivityHistory,
  fetchChainSummary,
  fetchLeaderboard,
  fetchRichlist,
} from "./legacy.js";

const emptyVrmNetwork = (): VrmNetworkStats => ({
  hashrateKhPerMin: null,
  hashrate7dKhPerMin: null,
  difficulty: null,
  blocks: null,
  supply: null,
  maxSupply: null,
});

function applySupplyMcap(
  market: HomeMarketPayload["vrm"],
  supply: number | null,
): HomeMarketPayload["vrm"] {
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
  const since30d = Math.floor(Date.now() / 1000) - 30 * 86_400;

  const [summary, richlist, leaderboard, network, marketPayload, activityHistory] =
    await Promise.all([
      fetchChainSummary("vrm", { skipLiveBlocks: true }),
      fetchRichlist("vrm", { limit: 5 }),
      fetchLeaderboard("vrm", { period: "month", sort: "activity", limit: 5 }),
      fetchVrmNetworkStats().catch(emptyVrmNetwork),
      fetchHomeMarket(null, null).catch(
        (): HomeMarketPayload => ({
          vrm: emptyMarket(),
          vrc: emptyMarket(),
          fetchedAt: new Date().toISOString(),
        }),
      ),
      fetchChainActivityHistory("vrm", { since: since30d, maxPoints: 100 }),
    ]);

  const market = applySupplyMcap(marketPayload.vrm, network.supply);

  return {
    summary,
    richlist,
    leaderboard,
    network,
    market,
    activityHistory,
    fetchedAt: new Date().toISOString(),
  };
}
