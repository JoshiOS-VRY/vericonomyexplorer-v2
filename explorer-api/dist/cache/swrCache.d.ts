import { LRUCache } from "lru-cache";
import type { ChainId } from "../types.js";
export type CacheValue = Record<string, unknown>;
export interface SwrOptions<T extends CacheValue = CacheValue> {
    max?: number;
    ttlMs?: number;
    staleTtlMs?: number;
    fetch: (key: string, signal: AbortSignal) => Promise<T>;
}
export declare function getApiCacheTtlMs(defaultTtlMs: number): number;
export declare function createSwrCache<T extends CacheValue = CacheValue>(options: SwrOptions<T>): LRUCache<string, T, unknown>;
export declare function cacheKey(chainId: ChainId, resource: string, suffix?: string): string;
export declare function safeCacheDelete<T extends CacheValue>(cache: LRUCache<string, T, unknown>, key: string): void;
export declare function refreshCacheInBackground(cache: LRUCache<string, CacheValue, unknown>, key: string): Promise<void>;
export declare function swrFetch<T>(cache: LRUCache<string, CacheValue, unknown>, key: string, fallback: () => Promise<T>): Promise<T>;
export declare function invalidateChain(cache: LRUCache<string, CacheValue, unknown>, chainId: ChainId): void;
