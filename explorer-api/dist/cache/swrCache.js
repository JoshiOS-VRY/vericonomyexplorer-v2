import { LRUCache } from "lru-cache";
export function getApiCacheTtlMs(defaultTtlMs) {
    const configured = Number(process.env.VCEXP_API_CACHE_TTL_MS);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return defaultTtlMs;
}
export function createSwrCache(options) {
    return new LRUCache({
        max: options.max ?? 64,
        ttl: getApiCacheTtlMs(options.ttlMs ?? 5_000),
        ttlResolution: 1,
        allowStale: true,
        updateAgeOnGet: true,
        fetchMethod: async (key, _staleValue, { signal }) => options.fetch(key, signal),
    });
}
export function cacheKey(chainId, resource, suffix = "") {
    return `${chainId}:${resource}${suffix ? `:${suffix}` : ""}`;
}
export function invalidateChain(cache, chainId) {
    for (const key of cache.keys()) {
        if (key.startsWith(`${chainId}:`)) {
            cache.delete(key);
        }
    }
}
