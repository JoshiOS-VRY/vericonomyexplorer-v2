import { cacheKey } from "../cache/swrCache.js";
import { fetchChainSummary } from "./legacy.js";
export async function refreshChainCachesOnTip(chainId, caches) {
    const summary = (await fetchChainSummary(chainId));
    const summaryKey = cacheKey(chainId, "summary");
    const latestKey = cacheKey(chainId, "latest-blocks");
    caches.summary.set(summaryKey, summary);
    caches.latestBlocks.set(latestKey, {
        blocks: Array.isArray(summary.latestBlocks) ? summary.latestBlocks : [],
    });
    if (caches.summaryLite) {
        caches.summaryLite.set(cacheKey(chainId, "summary-lite"), {
            ...summary,
            recentTransactions: [],
        });
    }
}
