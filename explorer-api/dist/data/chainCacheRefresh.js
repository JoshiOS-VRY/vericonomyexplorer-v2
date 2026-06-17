import { cacheKey } from '../cache/swrCache.js';
import { enrichLatestBlocksLive } from './liveEnrichment.js';
import { fetchChainSummary } from './legacy.js';
export async function refreshChainCachesOnTip(chainId, caches) {
    const summary = (await fetchChainSummary(chainId));
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
