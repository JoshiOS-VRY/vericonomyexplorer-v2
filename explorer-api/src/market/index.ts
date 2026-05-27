import { createSwrCache } from "../cache/swrCache.js";
import type { ChainId } from "../types.js";
import type { ChainMarket, HomeMarketPayload } from "../types/home.js";
import { fetchCoinGeckoBtcUsd, fetchCoinGeckoVericoin } from "./coingecko.js";
import {
  fetchLcwHistory24h,
  fetchLcwSingle,
  mapLcwToMarket,
} from "./livecoinwatch.js";

function getMarketCacheTtlMs(): number {
  const configured = Number(process.env.VCEXP_MARKET_CACHE_TTL_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return 120_000;
}

const emptyMarket = (): ChainMarket => ({
  usd: null,
  btc: null,
  marketCap: null,
  volume24h: null,
  change24h: null,
  circulatingSupply: null,
  source: "unavailable",
  updatedAt: null,
  priceHistory24h: [],
});

function finalizeMarket(
  partial: ReturnType<typeof mapLcwToMarket>,
  onChainSupply: number | null,
  btcUsd: number | null,
): ChainMarket {
  let { usd, btc, marketCap, source } = partial;

  if (btc == null && usd != null && btcUsd != null && btcUsd > 0) {
    btc = usd / btcUsd;
    if (source === "unavailable") source = "computed";
  }

  if (marketCap == null && usd != null && onChainSupply != null) {
    marketCap = usd * onChainSupply;
    if (source === "unavailable") source = "computed";
  }

  return {
    ...partial,
    usd,
    btc,
    marketCap,
    source,
  };
}

async function fetchChainMarketInternal(
  chainId: ChainId,
  onChainSupply: number | null,
): Promise<ChainMarket> {
  const [usdData, btcData, history, btcUsd, cgVrc] = await Promise.all([
    fetchLcwSingle(chainId, "USD"),
    fetchLcwSingle(chainId, "BTC"),
    fetchLcwHistory24h(chainId),
    fetchCoinGeckoBtcUsd(),
    chainId === "vrc" ? fetchCoinGeckoVericoin() : Promise.resolve(null),
  ]);

  let partial = mapLcwToMarket(usdData, btcData, history);

  if (chainId === "vrc" && cgVrc && partial.usd == null && cgVrc.usd != null) {
    partial = {
      ...partial,
      usd: cgVrc.usd,
      btc: cgVrc.btc ?? partial.btc,
      source: "coingecko",
      updatedAt: new Date().toISOString(),
    };
  }

  return finalizeMarket(partial, onChainSupply, btcUsd);
}

const marketCache = createSwrCache({
  max: 8,
  ttlMs: getMarketCacheTtlMs(),
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, supplyStr] = key.split(":");
    const supply = supplyStr === "null" ? null : Number(supplyStr);
    const result = await fetchChainMarketInternal(
      chainId as ChainId,
      Number.isFinite(supply) ? supply : null,
    );
    return result as unknown as Record<string, unknown>;
  },
});

export async function fetchChainMarket(
  chainId: ChainId,
  onChainSupply: number | null = null,
): Promise<ChainMarket> {
  const key = `${chainId}:${onChainSupply ?? "null"}`;
  const cached = await marketCache.fetch(key);
  return (cached ?? emptyMarket()) as unknown as ChainMarket;
}

export async function fetchHomeMarket(
  vrmSupply: number | null,
  vrcSupply: number | null,
): Promise<HomeMarketPayload> {
  const [vrm, vrc] = await Promise.all([
    fetchChainMarket("vrm", vrmSupply),
    fetchChainMarket("vrc", vrcSupply),
  ]);

  return {
    vrm,
    vrc,
    fetchedAt: new Date().toISOString(),
  };
}

export { emptyMarket };
