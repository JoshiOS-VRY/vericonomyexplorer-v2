import { cacheKey, createSwrCache, swrFetch, } from "../cache/swrCache.js";
import { invalidateAllTipCaches, registerChainScopedCache, registerGlobalCache, } from "../cache/registry.js";
import { fetchChainHealth, fetchChainActivityHistory, fetchChainSummary, fetchIndexerHealth, fetchLandingData, } from "../data/legacy.js";
import { fetchVrmDashboardBundle } from "../data/vrmDashboard.js";
import { onAnyTip } from "../live/brokers.js";
import { parseChainId } from "../types.js";
import { homeCache, homeShellCache } from "./home.js";
const summaryCache = createSwrCache({
    max: 32,
    ttlMs: 5_000,
    fetch: async (key, signal) => {
        const chainId = key.split(":")[0];
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchChainSummary(chainId));
    },
});
const landingCache = createSwrCache({
    max: 4,
    ttlMs: 60_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchLandingData());
    },
});
const dashboardCache = createSwrCache({
    max: 4,
    ttlMs: 30_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchVrmDashboardBundle());
    },
});
const healthCache = createSwrCache({
    max: 8,
    ttlMs: 10_000,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchIndexerHealth());
    },
});
const chainHealthCache = createSwrCache({
    max: 8,
    ttlMs: 10_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const chainId = key.split(":")[0];
        return (await fetchChainHealth(chainId));
    },
});
const activityHistoryCache = createSwrCache({
    max: 32,
    ttlMs: 60_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, maxPoints, since] = key.split(":");
        const result = await fetchChainActivityHistory(chainId, {
            maxPoints: maxPoints ? Number(maxPoints) : undefined,
            since: since ? Number(since) : undefined,
        });
        return result;
    },
});
registerChainScopedCache(summaryCache);
registerChainScopedCache(activityHistoryCache);
registerChainScopedCache(chainHealthCache);
registerGlobalCache(landingCache);
registerGlobalCache(dashboardCache);
registerGlobalCache(healthCache);
registerGlobalCache(homeCache);
registerGlobalCache(homeShellCache);
export function registerCacheInvalidation() {
    onAnyTip((chainId) => {
        invalidateAllTipCaches(chainId);
    });
}
export async function registerChainRoutes(app) {
    app.get("/v1/health", async () => ({
        ok: true,
        service: "explorer-api",
    }));
    app.get("/v1/indexer/status", async () => swrFetch(healthCache, "health", fetchIndexerHealth));
    app.get("/v1/landing", async () => swrFetch(landingCache, "landing", fetchLandingData));
    app.get("/v1/vrm/dashboard", async () => swrFetch(dashboardCache, "dashboard", fetchVrmDashboardBundle));
    app.get("/v1/:chain/summary", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        return swrFetch(summaryCache, cacheKey(chainId, "summary"), () => fetchChainSummary(chainId));
    });
    app.get("/v1/:chain/health", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        return chainHealthCache.fetch(cacheKey(chainId, "health"));
    });
    app.get("/v1/:chain/activity-history", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const maxPoints = request.query.maxPoints ?? "";
        const since = request.query.since ?? "";
        const key = `${chainId}:${maxPoints}:${since}`;
        return activityHistoryCache.fetch(key);
    });
    app.get("/v1/:chain/blocks/latest", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const summary = await summaryCache.fetch(cacheKey(chainId, "summary"));
        return summary?.latestBlocks ?? [];
    });
}
