import { heavyRateLimitRouteConfig } from "../env.js";
import { createSwrCache, swrFetch } from "../cache/swrCache.js";
import { fetchLeaderboard, fetchMinedLeaderboard, fetchRichlist } from "../data/legacy.js";
import { parseChainId } from "../types.js";
import { withTimeout } from "../util/timeout.js";
const heavyRouteTimeoutMs = Number(process.env.VCEXP_API_HEAVY_ROUTE_TIMEOUT_MS ?? 5_000);
const richlistCache = createSwrCache({
    max: 32,
    ttlMs: 10_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, limit, offset] = key.split(":");
        return fetchRichlist(chainId, {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    },
});
const leaderboardCache = createSwrCache({
    max: 32,
    ttlMs: 30_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, period, sort, limit, offset] = key.split(":");
        return fetchLeaderboard(chainId, {
            period: period || undefined,
            sort: sort || undefined,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    },
});
const minersCache = createSwrCache({
    max: 32,
    ttlMs: 30_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, period, limit, offset] = key.split(":");
        return fetchMinedLeaderboard(chainId, {
            period: period || undefined,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    },
});
export async function registerRichRoutes(app) {
    app.get("/v1/:chain/richlist", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const key = `${chainId}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
        return swrFetch(richlistCache, key, () => fetchRichlist(chainId, {
            limit: request.query.limit ? Number(request.query.limit) : undefined,
            offset: request.query.offset ? Number(request.query.offset) : undefined,
        }));
    });
    app.get("/v1/:chain/leaderboard", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const key = `${chainId}:${request.query.period ?? ""}:${request.query.sort ?? ""}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
        try {
            return await withTimeout(leaderboardCache.fetch(key), heavyRouteTimeoutMs, "leaderboard");
        }
        catch {
            const stale = leaderboardCache.get(key, { allowStale: true });
            if (stale)
                return stale;
            return fetchLeaderboard(chainId, {
                period: request.query.period,
                sort: request.query.sort,
                limit: request.query.limit ? Number(request.query.limit) : undefined,
                offset: request.query.offset ? Number(request.query.offset) : undefined,
            }).catch(() => ({
                chainId,
                enabled: true,
                trusted: false,
                items: [],
                backfillRequired: true,
                paging: { limit: 0, offset: 0, total: 0, hasMore: false },
            }));
        }
    });
    app.get("/v1/:chain/miners", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const key = `${chainId}:${request.query.period ?? ""}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
        try {
            return await withTimeout(minersCache.fetch(key), heavyRouteTimeoutMs, "miners");
        }
        catch {
            const stale = minersCache.get(key, { allowStale: true });
            if (stale)
                return stale;
            return fetchMinedLeaderboard(chainId, {
                period: request.query.period,
                limit: request.query.limit ? Number(request.query.limit) : undefined,
                offset: request.query.offset ? Number(request.query.offset) : undefined,
            }).catch(() => ({
                chainId,
                enabled: true,
                trusted: false,
                items: [],
                paging: { limit: 0, offset: 0, total: 0, hasMore: false },
            }));
        }
    });
}
