import type { ChainId } from "../types.js";
import type { PriceHistoryPoint } from "../types/home.js";
export type MarketHistoryPeriod = "7d" | "30d" | "90d" | "1y" | "all";
export type MarketHistoryCurrency = "usd" | "btc";
export interface MarketHistoryResult {
    chainId: ChainId;
    period: MarketHistoryPeriod;
    currency: MarketHistoryCurrency;
    since: number | null;
    points: PriceHistoryPoint[];
    source: "livecoinwatch" | "coingecko" | "unavailable";
    fetchedAt: string;
}
export declare function fetchMarketHistory(chainId: ChainId, period: MarketHistoryPeriod, currency?: MarketHistoryCurrency): Promise<MarketHistoryResult>;
