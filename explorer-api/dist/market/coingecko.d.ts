import type { ChainId } from '../types.js';
import type { PriceHistoryPoint } from '../types/home.js';
export declare function fetchCoinGeckoBtcUsd(): Promise<number | null>;
export declare function fetchCoinGeckoVericoin(): Promise<{
    usd: number | null;
    btc: number | null;
}>;
export declare function fetchCoinGeckoMarketChart(chainId: ChainId, days: number): Promise<PriceHistoryPoint[]>;
