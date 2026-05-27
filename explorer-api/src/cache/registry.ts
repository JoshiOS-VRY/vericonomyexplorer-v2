import type { LRUCache } from "lru-cache";
import type { ChainId } from "../types.js";
import { invalidateChain, safeCacheDelete, type CacheValue } from "./swrCache.js";

type AnyCache = LRUCache<string, CacheValue, unknown>;

const globalCaches = new Set<AnyCache>();
const chainScopedCaches = new Set<AnyCache>();

export function registerGlobalCache(cache: AnyCache): void {
  globalCaches.add(cache);
}

export function registerChainScopedCache(cache: AnyCache): void {
  chainScopedCaches.add(cache);
}

export function invalidateGlobalCaches(keys: string[]): void {
  for (const key of keys) {
    for (const cache of globalCaches) {
      safeCacheDelete(cache, key);
    }
  }
}

export function invalidateAllChainCaches(chainId: ChainId): void {
  for (const cache of chainScopedCaches) {
    invalidateChain(cache, chainId);
  }
}

export function invalidateAllTipCaches(chainId: ChainId): void {
  invalidateAllChainCaches(chainId);
  invalidateGlobalCaches(["landing", "home", "dashboard", "health", "shell"]);
}
