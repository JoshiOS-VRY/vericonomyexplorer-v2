import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { runIndexerQuery } from "../db/queryPool.js";
import { fetchVrmNetworkStats } from "../network/index.js";
import type { HomeMarketPayload, VrmNetworkStats } from "../types/home.js";
import { enrichChainSummary } from "./liveEnrichment.js";

const emptyVrmNetwork = (): VrmNetworkStats => ({
  hashrateKhPerMin: null,
  hashrate7dKhPerMin: null,
  difficulty: null,
  blocks: null,
  supply: null,
  maxSupply: null,
});

const emptyActivityHistory = (): Record<string, unknown> => ({
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
    runIndexerQuery<Record<string, unknown>>("getChainSummaryIndexed", ["vrm"], skipLiveBlocks),
    runIndexerQuery<Record<string, unknown>>("getRichlist", ["vrm"], { limit: 5 }),
    runIndexerQuery<Record<string, unknown>>("getLeaderboard", ["vrm"], {
      period: "month",
      sort: "activity",
      limit: 5,
    }),
    runIndexerQuery<Record<string, unknown>>("getChainActivityHistory", ["vrm"], {
      since: since30d,
      maxPoints: 100,
    }).catch(() => emptyActivityHistory()),
  ]);

  return { summary, richlist, leaderboard, activityHistory };
}

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
  const [indexed, network, marketPayload] = await Promise.all([
    fetchVrmDashboardIndexed(),
    fetchVrmNetworkStats().catch(emptyVrmNetwork),
    fetchHomeMarket(null, null).catch(
      (): HomeMarketPayload => ({
        vrm: emptyMarket(),
        vrc: emptyMarket(),
        fetchedAt: new Date().toISOString(),
      }),
    ),
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
