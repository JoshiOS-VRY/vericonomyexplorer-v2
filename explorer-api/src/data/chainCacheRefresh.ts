import type { LRUCache } from 'lru-cache';
import { cacheKey, type CacheValue } from '../cache/swrCache.js';
import type { ChainId } from '../types.js';
import { enrichLatestBlocksLive } from './liveEnrichment.js';
import { fetchChainSummary } from './legacy.js';

type ChainCacheSet = LRUCache<string, CacheValue, unknown>;

export async function refreshChainCachesOnTip(
  chainId: ChainId,
  caches: {
    summary: ChainCacheSet;
    summaryLite?: ChainCacheSet;
    latestBlocks: ChainCacheSet;
  }
): Promise<void> {
  const summary = (await fetchChainSummary(chainId)) as CacheValue & {
    latestBlocks?: unknown[];
    health?: Record<string, unknown>;
  };
  const summaryKey = cacheKey(chainId, 'summary');
  const latestKey = cacheKey(chainId, 'latest-blocks');

  caches.summary.set(summaryKey, summary);
  const blocks = await enrichLatestBlocksLive(summary.latestBlocks, chainId, summary.health);
  caches.latestBlocks.set(latestKey, { blocks });

  if (caches.summaryLite) {
    caches.summaryLite.set(cacheKey(chainId, 'summary-lite'), {
      ...summary,
      recentTransactions: [],
    });
  }
}
