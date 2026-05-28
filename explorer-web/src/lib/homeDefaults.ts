import type { HomeMarketPayload, HomeNetworkPayload } from "@/lib/api/types";

export function emptyMarketPayload(): HomeMarketPayload {
  const empty = {
    usd: null,
    btc: null,
    marketCap: null,
    volume24h: null,
    change24h: null,
    circulatingSupply: null,
    source: "unavailable" as const,
    updatedAt: null,
    priceHistory24h: [],
  };

  return {
    vrm: empty,
    vrc: empty,
    fetchedAt: new Date().toISOString(),
  };
}

export function emptyNetworkPayload(): HomeNetworkPayload {
  return {
    vrm: {
      hashrateKhPerMin: null,
      hashrate7dKhPerMin: null,
      difficulty: null,
      blocks: null,
      supply: null,
      maxSupply: null,
    },
    vrc: {
      difficulty: null,
      blocks: null,
      supply: null,
      maxSupply: null,
      interestRatePercent: null,
      netStakeWeight: null,
      percentStaked: null,
      expectedStakeTimeSeconds: null,
    },
    fetchedAt: new Date().toISOString(),
  };
}
