import { LRUCache } from "lru-cache";
import { isSqliteBusyError } from "../errors.js";
import type { ChainId } from "../types.js";

export type CacheValue = Record<string, unknown>;

export interface SwrOptions<T extends CacheValue = CacheValue> {
  max?: number;
  ttlMs?: number;
  staleTtlMs?: number;
  fetch: (key: string, signal: AbortSignal) => Promise<T>;
}

export function getApiCacheTtlMs(defaultTtlMs: number): number {
  const configured = Number(process.env.VCEXP_API_CACHE_TTL_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return defaultTtlMs;
}

export function createSwrCache<T extends CacheValue = CacheValue>(
  options: SwrOptions<T>,
): LRUCache<string, T, unknown> {
  return new LRUCache<string, T, unknown>({
    max: options.max ?? 64,
    ttl: getApiCacheTtlMs(options.ttlMs ?? 5_000),
    ttlResolution: 1,
    allowStale: true,
    updateAgeOnGet: true,
    fetchMethod: async (key, _staleValue, { signal }) => options.fetch(key, signal),
  });
}

export function cacheKey(chainId: ChainId, resource: string, suffix = ""): string {
  return `${chainId}:${resource}${suffix ? `:${suffix}` : ""}`;
}

export function safeCacheDelete<T extends CacheValue>(
  cache: LRUCache<string, T, unknown>,
  key: string,
): void {
  try {
    cache.delete(key);
  } catch {
    /* entry may be mid-fetch (lru-cache throws "deleted") */
  }
}

export async function refreshCacheInBackground(
  cache: LRUCache<string, CacheValue, unknown>,
  key: string,
): Promise<void> {
  try {
    await cache.fetch(key, { forceRefresh: true });
  } catch {
    /* background refresh must not throw */
  }
}

export async function swrFetch<T>(
  cache: LRUCache<string, CacheValue, unknown>,
  key: string,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    const data = await cache.fetch(key);
    return (data ?? (await fallback())) as T;
  } catch (err) {
    if (err instanceof Error && err.message === "deleted") {
      return fallback();
    }

    if (isSqliteBusyError(err)) {
      const stale = cache.get(key, { allowStale: true }) as T | undefined;
      if (stale) {
        return stale;
      }
    }

    throw err;
  }
}

export function invalidateChain(
  cache: LRUCache<string, CacheValue, unknown>,
  chainId: ChainId,
): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${chainId}:`)) {
      safeCacheDelete(cache, key);
    }
  }
}
