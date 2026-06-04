import { LRUCache } from "lru-cache";
import { isSqliteBusyError } from "../errors.js";
export function getApiCacheTtlMs(defaultTtlMs) {
    const configured = Number(process.env.VCEXP_API_CACHE_TTL_MS);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return defaultTtlMs;
}
export function createSwrCache(options) {
    const baseTtlMs = options.ttlMs ?? 5_000;
    const ttlMs = options.useGlobalTtlOverride === false ? baseTtlMs : getApiCacheTtlMs(baseTtlMs);
    return new LRUCache({
        max: options.max ?? 64,
        ttl: ttlMs,
        ttlResolution: 1,
        allowStale: true,
        updateAgeOnGet: true,
        fetchMethod: async (key, _staleValue, { signal }) => options.fetch(key, signal),
    });
}
export function cacheKey(chainId, resource, suffix = "") {
    return `${chainId}:${resource}${suffix ? `:${suffix}` : ""}`;
}
export function safeCacheDelete(cache, key) {
    try {
        cache.delete(key);
    }
    catch {
        /* entry may be mid-fetch (lru-cache throws "deleted") */
    }
}
export async function refreshCacheInBackground(cache, key) {
    try {
        await cache.fetch(key, { forceRefresh: true });
    }
    catch {
        /* background refresh must not throw */
    }
}
export async function swrFetch(cache, key, fallback) {
    try {
        const data = await cache.fetch(key);
        return (data ?? (await fallback()));
    }
    catch (err) {
        if (err instanceof Error && err.message === "deleted") {
            return fallback();
        }
        if (isSqliteBusyError(err)) {
            const stale = cache.get(key, { allowStale: true });
            if (stale) {
                return stale;
            }
        }
        throw err;
    }
}
export function invalidateChain(cache, chainId) {
    for (const key of cache.keys()) {
        if (key.startsWith(`${chainId}:`)) {
            safeCacheDelete(cache, key);
        }
    }
}
