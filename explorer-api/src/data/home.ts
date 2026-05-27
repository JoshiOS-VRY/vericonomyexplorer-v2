import { emptyMarket, fetchHomeMarket } from "../market/index.js";
import { fetchVrcNetworkStats, fetchVrmNetworkStats } from "../network/index.js";
import type {
  HomeMarketPayload,
  HomeNetworkPayload,
  HomePayload,
  HomeShellPayload,
  VrcNetworkStats,
  VrmNetworkStats,
} from "../types/home.js";
import { fetchLandingData } from "./legacy.js";

const emptyVrmNetwork = (): VrmNetworkStats => ({
  hashrateKhPerMin: null,
  hashrate7dKhPerMin: null,
  difficulty: null,
  blocks: null,
  supply: null,
  maxSupply: null,
});

const emptyVrcNetwork = (): VrcNetworkStats => ({
  difficulty: null,
  blocks: null,
  supply: null,
  maxSupply: null,
  interestRatePercent: null,
  netStakeWeight: null,
  percentStaked: null,
  expectedStakeTimeSeconds: null,
});

export async function fetchHomeShell(): Promise<HomeShellPayload> {
  const landing = await fetchLandingData();

  return {
    vrm: {
      summary: landing.vrmSummary as Record<string, unknown>,
      richlist: landing.vrmRichlist as Record<string, unknown>,
    },
    vrc: {
      summary: landing.vrcSummary as Record<string, unknown>,
      richlist: landing.vrcRichlist as Record<string, unknown>,
    },
    vrmLeaderboard: landing.vrmLeaderboard as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchHomeNetwork(): Promise<HomeNetworkPayload> {
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

export async function fetchHomeData(): Promise<HomePayload> {
  const [landing, vrmNetwork, vrcNetwork, market] = await Promise.all([
    fetchLandingData(),
    fetchVrmNetworkStats().catch(emptyVrmNetwork),
    fetchVrcNetworkStats().catch(emptyVrcNetwork),
    fetchHomeMarket(null, null).catch(
      (): HomeMarketPayload => ({
        vrm: emptyMarket(),
        vrc: emptyMarket(),
        fetchedAt: new Date().toISOString(),
      }),
    ),
  ]);

  const vrmMarket = applySupplyMcap(market.vrm, vrmNetwork.supply);
  const vrcMarket = applySupplyMcap(market.vrc, vrcNetwork.supply);

  return {
    vrm: {
      summary: landing.vrmSummary as Record<string, unknown>,
      richlist: landing.vrmRichlist as Record<string, unknown>,
      market: vrmMarket,
      network: vrmNetwork,
    },
    vrc: {
      summary: landing.vrcSummary as Record<string, unknown>,
      richlist: landing.vrcRichlist as Record<string, unknown>,
      market: vrcMarket,
      network: vrcNetwork,
    },
    vrmLeaderboard: landing.vrmLeaderboard as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
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

export async function fetchHomeMarketOnly(): Promise<HomeMarketPayload> {
  return fetchHomeMarket(null, null);
}
