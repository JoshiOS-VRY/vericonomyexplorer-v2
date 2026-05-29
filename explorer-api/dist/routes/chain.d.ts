import type { FastifyInstance } from "fastify";
import { type CacheValue } from "../cache/swrCache.js";
export declare const summaryCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare const summaryLiteCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare const latestBlocksCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare const chainHealthCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare const activityHistoryCache: import("lru-cache/raw").LRUCache<string, CacheValue, unknown>;
export declare function registerCacheInvalidation(): void;
export declare function registerChainRoutes(app: FastifyInstance): Promise<void>;
