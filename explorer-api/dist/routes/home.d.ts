import type { FastifyInstance } from 'fastify';
declare const homeCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
declare const homeShellCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
declare const homeNetworkCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
declare const homeMarketCache: import("lru-cache/raw").LRUCache<string, Record<string, unknown>, unknown>;
export declare function registerHomeCacheInvalidation(): void;
export declare function registerHomeRoutes(app: FastifyInstance): Promise<void>;
export { homeCache, homeMarketCache, homeNetworkCache, homeShellCache };
