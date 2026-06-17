import type { LRUCache } from 'lru-cache';
import { type CacheValue } from '../cache/swrCache.js';
import type { ChainId } from '../types.js';
type ChainCacheSet = LRUCache<string, CacheValue, unknown>;
export declare function refreshChainCachesOnTip(chainId: ChainId, caches: {
    summary: ChainCacheSet;
    summaryLite?: ChainCacheSet;
    latestBlocks: ChainCacheSet;
}): Promise<void>;
export {};
