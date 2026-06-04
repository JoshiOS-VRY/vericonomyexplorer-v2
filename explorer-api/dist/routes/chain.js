import { healthRateLimitRouteConfig, heavyRateLimitRouteConfig } from "../env.js";
import { cacheKey, createSwrCache, refreshCacheInBackground, swrFetch, } from "../cache/swrCache.js";
import { registerChainScopedCache, registerGlobalCache } from "../cache/registry.js";
import { registerChainTipRefresh, registerGlobalTipRefresh, refreshOnTip, } from "../cache/tipRefresh.js";
import { refreshChainCachesOnTip } from "../data/chainCacheRefresh.js";
import { fetchChainHealth, fetchChainActivityHistory, fetchChainSummary, fetchChainSummaryLite, fetchIndexerHealth, fetchLandingData, fetchLatestBlocks, fetchBlocksPage, } from "../data/legacy.js";
import { fetchVrmDashboardBundle } from "../data/vrmDashboard.js";
import { onAnyTip } from "../live/brokers.js";
import { parseChainId } from "../types.js";
import { homeCache, homeShellCache } from "./home.js";
export const summaryCache = createSwrCache({
    max: 32,
    ttlMs: 30_000,
    fetch: async (key, signal) => {
        const chainId = key.split(":")[0];
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchChainSummary(chainId));
    },
});
export const summaryLiteCache = createSwrCache({
    max: 32,
    ttlMs: 30_000,
    fetch: async (key, signal) => {
        const chainId = key.split(":")[0];
        if (signal.aborted)
            throw new Error("aborted");
        return (await fetchChainSummaryLite(chainId));
    },
});
export const latestBlocksCache = createSwrCache({
    max: 32,
    ttlMs: 2_000,
    fetch: async (key, signal) => {
        const chainId = key.split(":")[0];
        if (signal.aborted)
            throw new Error("aborted");
        const blocks = await fetchLatestBlocks(chainId);
        return { blocks };
    },
});
export const blocksPageCache = createSwrCache({
    max: 64,
    ttlMs: 5_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, , limit, offset] = key.split(":");
        return (await fetchBlocksPage(chainId, {
            limit,
            offset,
        }));
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
export const chainHealthCache = createSwrCache({
    max: 8,
    ttlMs: 10_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const chainId = key.split(":")[0];
        return (await fetchChainHealth(chainId));
    },
});
export const activityHistoryCache = createSwrCache({
    max: 32,
    ttlMs: 300_000,
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
registerChainScopedCache(summaryLiteCache);
registerChainScopedCache(latestBlocksCache);
registerChainScopedCache(activityHistoryCache);
registerChainScopedCache(chainHealthCache);
registerGlobalCache(landingCache);
registerGlobalCache(dashboardCache);
registerGlobalCache(healthCache);
registerGlobalCache(homeCache);
registerGlobalCache(homeShellCache);
registerChainTipRefresh(async (chainId) => {
    await refreshChainCachesOnTip(chainId, {
        summary: summaryCache,
        summaryLite: summaryLiteCache,
        latestBlocks: latestBlocksCache,
    });
    await refreshCacheInBackground(chainHealthCache, cacheKey(chainId, "health"));
});
registerGlobalTipRefresh("landing", () => refreshCacheInBackground(landingCache, "landing"));
registerGlobalTipRefresh("dashboard", () => refreshCacheInBackground(dashboardCache, "dashboard"));
registerGlobalTipRefresh("health", () => refreshCacheInBackground(healthCache, "health"));
export function registerCacheInvalidation() {
    onAnyTip((chainId) => {
        refreshOnTip(chainId);
    });
}
export async function registerChainRoutes(app) {
    app.get("/v1/health", { ...healthRateLimitRouteConfig }, async () => ({
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
    app.get("/v1/:chain/summary/lite", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        return swrFetch(summaryLiteCache, cacheKey(chainId, "summary-lite"), () => fetchChainSummaryLite(chainId));
    });
    app.get("/v1/:chain/health", { ...healthRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        return chainHealthCache.fetch(cacheKey(chainId, "health"));
    });
    app.get("/v1/:chain/activity-history", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const maxPoints = request.query.maxPoints ?? "";
        const since = request.query.since ?? "";
        const cappedMaxPoints = maxPoints
            ? String(Math.min(Math.max(Number(maxPoints) || 120, 2), 120))
            : "";
        const key = `${chainId}:${cappedMaxPoints}:${since}`;
        return swrFetch(activityHistoryCache, key, () => fetchChainActivityHistory(chainId, {
            maxPoints: cappedMaxPoints ? Number(cappedMaxPoints) : undefined,
            since: since ? Number(since) : undefined,
        }));
    });
    app.get("/v1/:chain/blocks/latest", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const cached = await swrFetch(latestBlocksCache, cacheKey(chainId, "latest-blocks"), async () => ({ blocks: await fetchLatestBlocks(chainId) }));
        return cached.blocks ?? [];
    });
    app.get("/v1/:chain/blocks", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const limit = request.query.limit ?? "";
        const offset = request.query.offset ?? "";
        return swrFetch(blocksPageCache, cacheKey(chainId, "blocks", `${limit}:${offset}`), () => fetchBlocksPage(chainId, { limit, offset }));
    });
}
