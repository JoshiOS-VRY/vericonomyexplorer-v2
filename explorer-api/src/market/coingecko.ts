import type { ChainId } from "../types.js";
import type { PriceHistoryPoint } from "../types/home.js";

interface CoinGeckoSimplePrice {
  bitcoin?: { usd?: number };
  vericoin?: { usd?: number; btc?: number };
}

export async function fetchCoinGeckoBtcUsd(): Promise<number | null> {
  const apiKey = process.env.VCEXP_COINGECKO_API_KEY?.trim();
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      {
        headers,
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as CoinGeckoSimplePrice;
    const usd = data.bitcoin?.usd;
    return typeof usd === "number" && Number.isFinite(usd) ? usd : null;
  } catch {
    return null;
  }
}

export async function fetchCoinGeckoVericoin(): Promise<{ usd: number | null; btc: number | null }> {
  const apiKey = process.env.VCEXP_COINGECKO_API_KEY?.trim();
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=vericoin&vs_currencies=usd,btc",
      {
        headers,
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) return { usd: null, btc: null };

    const data = (await response.json()) as CoinGeckoSimplePrice;
    const usd = data.vericoin?.usd;
    const btc = data.vericoin?.btc;
    return {
      usd: typeof usd === "number" && Number.isFinite(usd) ? usd : null,
      btc: typeof btc === "number" && Number.isFinite(btc) ? btc : null,
    };
  } catch {
    return { usd: null, btc: null };
  }
}

const COINGECKO_IDS: Record<ChainId, string> = {
  vrm: "verium-reserve",
  vrc: "vericoin",
};

export async function fetchCoinGeckoMarketChart(
  chainId: ChainId,
  days: number,
): Promise<PriceHistoryPoint[]> {
  const apiKey = process.env.VCEXP_COINGECKO_API_KEY?.trim();
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  const coinId = COINGECKO_IDS[chainId];
  if (!coinId) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers,
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as { prices?: [number, number][] };
    if (!Array.isArray(data.prices)) return [];

    return data.prices
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([time, value]) => ({
        time: Math.floor(time / 1000),
        value,
      }));
  } catch {
    return [];
  }
}
