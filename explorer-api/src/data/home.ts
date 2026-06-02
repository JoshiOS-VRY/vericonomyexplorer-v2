import { fetchHomeMarket, applyOnChainMarketCap } from "../market/index.js";
import {
  fetchVrcNetworkStats,
  fetchVrmNetworkStats,
} from "../network/index.js";
import {
  fetchVrcNetworkStatsLite,
  fetchVrmNetworkStatsLite,
} from "../network/lite.js";
import type {
  HomeMarketPayload,
  HomeNetworkPayload,
  HomePayload,
  HomeShellPayload,
  VrcNetworkStats,
  VrmNetworkStats,
} from "../types/home.js";
import { fetchLandingData } from "./legacy.js";
import { withTimeout } from "../util/timeout.js";

const homeNetworkTimeoutMs = Number(process.env.VCEXP_HOME_NETWORK_TIMEOUT_MS ?? 6_000);

const emptyVrmNetwork = (): VrmNetworkStats => ({
  hashrateKhPerMin: null,
  avgBlockTimeMin: null,
  blocksPerHour: null,
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

export async function fetchHomeNetworkLite(): Promise<HomeNetworkPayload> {
  const [vrmNetwork, vrcNetwork] = await Promise.all([
    fetchVrmNetworkStatsLite().catch(emptyVrmNetwork),
    fetchVrcNetworkStatsLite().catch(emptyVrcNetwork),
  ]);

  return {
    vrm: vrmNetwork,
    vrc: vrcNetwork,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchHomeNetwork(): Promise<HomeNetworkPayload> {
  return withTimeout(
    (async () => {
      const [vrmNetwork, vrcNetwork] = await Promise.all([
        fetchVrmNetworkStatsLite().catch(emptyVrmNetwork),
        fetchVrcNetworkStatsLite().catch(emptyVrcNetwork),
      ]);

      return {
        vrm: vrmNetwork,
        vrc: vrcNetwork,
        fetchedAt: new Date().toISOString(),
      };
    })(),
    homeNetworkTimeoutMs,
    "fetchHomeNetwork",
  );
}

export async function fetchHomeData(): Promise<HomePayload> {
  const [shell, network, market] = await Promise.all([
    fetchHomeShell(),
    fetchHomeNetwork(),
    fetchHomeMarketOnly(),
  ]);

  const vrmMarket = applyOnChainMarketCap(market.vrm, "vrm", network.vrm.supply);
  const vrcMarket = applyOnChainMarketCap(market.vrc, "vrc", network.vrc.supply);

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

export async function fetchHomeMarketOnly(): Promise<HomeMarketPayload> {
  const [vrmNetwork, vrcNetwork] = await Promise.all([
    fetchVrmNetworkStats().catch(emptyVrmNetwork),
    fetchVrcNetworkStats().catch(emptyVrcNetwork),
  ]);

  const market = await fetchHomeMarket(vrmNetwork.supply, vrcNetwork.supply);

  return {
    vrm: applyOnChainMarketCap(market.vrm, "vrm", vrmNetwork.supply),
    vrc: applyOnChainMarketCap(market.vrc, "vrc", vrcNetwork.supply),
    fetchedAt: market.fetchedAt,
  };
}
