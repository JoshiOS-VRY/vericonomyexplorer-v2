import { invalidateChain, safeCacheDelete } from "./swrCache.js";
const globalCaches = new Set();
const chainScopedCaches = new Set();
export function registerGlobalCache(cache) {
    globalCaches.add(cache);
}
export function registerChainScopedCache(cache) {
    chainScopedCaches.add(cache);
}
export function invalidateGlobalCaches(keys) {
    for (const key of keys) {
        for (const cache of globalCaches) {
            safeCacheDelete(cache, key);
        }
    }
}
export function invalidateAllChainCaches(chainId) {
    for (const cache of chainScopedCaches) {
        invalidateChain(cache, chainId);
    }
}
export function invalidateAllTipCaches(chainId) {
    invalidateAllChainCaches(chainId);
    invalidateGlobalCaches(["landing", "home", "dashboard", "health", "shell"]);
}
