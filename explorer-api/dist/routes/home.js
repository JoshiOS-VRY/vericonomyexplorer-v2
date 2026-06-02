import { createSwrCache, refreshCacheInBackground, swrFetch } from "../cache/swrCache.js";
import { registerGlobalCache } from "../cache/registry.js";
import { registerGlobalTipRefresh } from "../cache/tipRefresh.js";
import { fetchHomeData, fetchHomeMarketOnly, fetchHomeNetwork, fetchHomeNetworkLite, fetchHomeShell, } from "../data/home.js";
import { withTimeout } from "../util/timeout.js";
const homeNetworkRouteTimeoutMs = Number(process.env.VCEXP_HOME_NETWORK_ROUTE_TIMEOUT_MS ?? 5_000);
const homeCache = createSwrCache({
    max: 4,
    ttlMs: 30_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const data = await fetchHomeData();
        return data;
    },
});
const homeShellCache = createSwrCache({
    max: 4,
    ttlMs: 30_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const data = await fetchHomeShell();
        return data;
    },
});
const homeNetworkCache = createSwrCache({
    max: 4,
    ttlMs: 30_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const data = await fetchHomeNetwork();
        return data;
    },
});
const homeMarketCache = createSwrCache({
    max: 4,
    ttlMs: Number(process.env.VCEXP_MARKET_CACHE_TTL_MS) || 120_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const data = await fetchHomeMarketOnly();
        return data;
    },
});
registerGlobalCache(homeCache);
registerGlobalCache(homeShellCache);
registerGlobalCache(homeNetworkCache);
registerGlobalCache(homeMarketCache);
registerGlobalTipRefresh("home", () => refreshCacheInBackground(homeCache, "home"));
registerGlobalTipRefresh("shell", () => refreshCacheInBackground(homeShellCache, "shell"));
registerGlobalTipRefresh("network", () => refreshCacheInBackground(homeNetworkCache, "network"));
export function registerHomeCacheInvalidation() {
    /* home/shell/network refresh is registered via registerGlobalTipRefresh above */
}
export async function registerHomeRoutes(app) {
    app.get("/v1/home", async () => swrFetch(homeCache, "home", fetchHomeData));
    app.get("/v1/home/shell", async () => swrFetch(homeShellCache, "shell", fetchHomeShell));
    app.get("/v1/home/network", async () => {
        const stale = homeNetworkCache.get("network", { allowStale: true });
        try {
            return await withTimeout(swrFetch(homeNetworkCache, "network", fetchHomeNetwork), homeNetworkRouteTimeoutMs, "home/network");
        }
        catch {
            if (stale) {
                return stale;
            }
            return fetchHomeNetworkLite();
        }
    });
    app.get("/v1/home/market", async () => swrFetch(homeMarketCache, "market", fetchHomeMarketOnly));
}
export { homeCache, homeMarketCache, homeNetworkCache, homeShellCache };
