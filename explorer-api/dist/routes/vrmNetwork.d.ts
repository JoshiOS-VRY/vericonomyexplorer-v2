import type { FastifyInstance } from 'fastify';
import type { VrmNetworkHashratePayload } from '../types/home.js';
/** CoinGecko-style supply payload: `{ "result": "<amount>" }` with up to 8 decimal places. */
export type VrmSupplyPayload = {
    result: string;
};
/** Format on-chain VRM supply for external aggregators (VRM uses 8 decimal places). */
export declare function formatVrmSupplyResult(supply: number): string;
declare function fetchVrmSupplyPayload(): Promise<VrmSupplyPayload>;
declare function fetchVrmNetworkHashratePayload(): Promise<VrmNetworkHashratePayload>;
declare const vrmHashrateCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
declare const vrmSupplyCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
export declare function registerVrmNetworkRoutes(app: FastifyInstance): Promise<void>;
export { vrmHashrateCache, fetchVrmNetworkHashratePayload, vrmSupplyCache, fetchVrmSupplyPayload };
