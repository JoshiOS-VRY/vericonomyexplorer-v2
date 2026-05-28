import type { ChainId } from "../types.js";
import type { ChainMarket, PriceHistoryPoint } from "../types/home.js";
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
export declare function fetchLcwSingle(chainId: ChainId, currency: "USD" | "BTC"): Promise<LcwSingleResponse | null>;
export declare function fetchLcwHistory24h(chainId: ChainId): Promise<LcwHistoryPoint[]>;
export declare function fetchLcwHistoryRange(chainId: ChainId, currency: "USD" | "BTC", startMs: number, endMs: number): Promise<PriceHistoryPoint[]>;
export declare function mapLcwToMarket(usdData: LcwSingleResponse | null, btcData: LcwSingleResponse | null, history: LcwHistoryPoint[]): Omit<ChainMarket, "marketCap"> & {
    marketCap: number | null;
};
export {};
