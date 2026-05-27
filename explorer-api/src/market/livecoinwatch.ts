import type { ChainId } from "../types.js";
import type { ChainMarket } from "../types/home.js";
import { LCW_CHAIN_CODES } from "../types/home.js";

const LCW_BASE = "https://api.livecoinwatch.com";

interface LcwSingleResponse {
  rate?: number | null;
  cap?: number | null;
  volume?: number | null;
  circulatingSupply?: number | null;
  delta?: {
    day?: number | null;
  };
}

interface LcwHistoryPoint {
  date: number;
  rate: number;
}

function getLcwApiKey(): string | undefined {
  return process.env.VCEXP_LCW_API_KEY?.trim() || undefined;
}

async function lcwPost<T>(path: string, body: unknown): Promise<T | null> {
  const apiKey = getLcwApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${LCW_BASE}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchLcwSingle(
  chainId: ChainId,
  currency: "USD" | "BTC",
): Promise<LcwSingleResponse | null> {
  return lcwPost<LcwSingleResponse>("/coins/single", {
    currency,
    code: LCW_CHAIN_CODES[chainId],
    meta: true,
  });
}

export async function fetchLcwHistory24h(chainId: ChainId): Promise<LcwHistoryPoint[]> {
  const end = Date.now();
  const start = end - 24 * 60 * 60 * 1000;
  const data = await lcwPost<LcwHistoryPoint[]>("/coins/single/history", {
    currency: "USD",
    code: LCW_CHAIN_CODES[chainId],
    start,
    end,
    meta: false,
  });

  if (!Array.isArray(data)) return [];
  return data.filter((point) => typeof point.rate === "number" && Number.isFinite(point.rate));
}

export function mapLcwToMarket(
  usdData: LcwSingleResponse | null,
  btcData: LcwSingleResponse | null,
  history: LcwHistoryPoint[],
): Omit<ChainMarket, "marketCap"> & { marketCap: number | null } {
  const usd = usdData?.rate ?? null;
  const btc = btcData?.rate ?? null;
  const updatedAt = new Date().toISOString();

  return {
    usd: typeof usd === "number" && Number.isFinite(usd) ? usd : null,
    btc: typeof btc === "number" && Number.isFinite(btc) ? btc : null,
    marketCap: typeof usdData?.cap === "number" && Number.isFinite(usdData.cap) ? usdData.cap : null,
    volume24h:
      typeof usdData?.volume === "number" && Number.isFinite(usdData.volume)
        ? usdData.volume
        : null,
    change24h:
      typeof usdData?.delta?.day === "number" && Number.isFinite(usdData.delta.day)
        ? usdData.delta.day
        : null,
    circulatingSupply:
      typeof usdData?.circulatingSupply === "number" && Number.isFinite(usdData.circulatingSupply)
        ? usdData.circulatingSupply
        : null,
    source: usd != null || btc != null ? "livecoinwatch" : "unavailable",
    updatedAt: usd != null || btc != null ? updatedAt : null,
    priceHistory24h: history.map((point) => ({ time: point.date, value: point.rate })),
  };
}
