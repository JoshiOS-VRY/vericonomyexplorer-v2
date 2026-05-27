import { LRUCache } from "lru-cache";
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

export function invalidateChain(
  cache: LRUCache<string, CacheValue, unknown>,
  chainId: ChainId,
): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${chainId}:`)) {
      cache.delete(key);
    }
  }
}
