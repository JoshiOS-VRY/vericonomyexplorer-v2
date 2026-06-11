import type { FastifyInstance } from "fastify";
/** CoinGecko-style supply payload: `{ "result": "<amount>" }` with up to 8 decimal places. */
export type VrcSupplyPayload = {
    result: string;
};
/** Format on-chain VRC supply for external aggregators (VRC uses 8 decimal places). */
export declare function formatVrcSupplyResult(supply: number): string;
declare function fetchVrcSupplyPayload(): Promise<VrcSupplyPayload>;
declare const vrcSupplyCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
export declare function registerVrcNetworkRoutes(app: FastifyInstance): Promise<void>;
export { vrcSupplyCache, fetchVrcSupplyPayload };
