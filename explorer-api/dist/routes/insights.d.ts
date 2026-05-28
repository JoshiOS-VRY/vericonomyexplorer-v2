import type { FastifyInstance } from "fastify";
import { type CacheValue } from "../cache/swrCache.js";
declare const networkHistoryCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
declare const marketHistoryCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare function registerInsightsRoutes(app: FastifyInstance): Promise<void>;
export { networkHistoryCache, marketHistoryCache };
