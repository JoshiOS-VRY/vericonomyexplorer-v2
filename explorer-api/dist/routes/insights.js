import { cacheKey, createSwrCache, } from "../cache/swrCache.js";
import { registerChainScopedCache } from "../cache/registry.js";
import { fetchNetworkMetricHistory } from "../data/insightsNetwork.js";
import { fetchMarketHistory } from "../market/history.js";
import { parseChainId } from "../types.js";
import { chainHealthCache } from "./chain.js";
const networkHistoryCache = createSwrCache({
    max: 32,
    ttlMs: 60_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, maxPoints, since, groupBy] = key.split(":");
        const parsedChainId = parseChainId(chainId);
        const chainHealth = parsedChainId
            ? (await chainHealthCache.fetch(cacheKey(parsedChainId, "health")))
            : undefined;
        const result = await fetchNetworkMetricHistory(chainId, {
            maxPoints: maxPoints ? Number(maxPoints) : undefined,
            since: since ? Number(since) : undefined,
            groupBy: groupBy || undefined,
            chainHealth,
        });
        return result;
    },
});
const marketHistoryCache = createSwrCache({
    max: 16,
    ttlMs: 120_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, period, currency] = key.split(":");
        const result = await fetchMarketHistory(parseChainId(chainId) ?? "vrm", period, currency);
        return result;
    },
});
registerChainScopedCache(networkHistoryCache);
registerChainScopedCache(marketHistoryCache);
export async function registerInsightsRoutes(app) {
    app.get("/v1/:chain/insights/network-history", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const maxPoints = request.query.maxPoints ?? "";
        const since = request.query.since ?? "";
        const groupBy = request.query.groupBy ?? "day";
        const key = `${chainId}:${maxPoints}:${since}:${groupBy}`;
        return networkHistoryCache.fetch(key);
    });
    app.get("/v1/:chain/insights/market-history", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const period = (request.query.period ?? "30d");
        const currency = (request.query.currency ?? "usd");
        const key = `${chainId}:${period}:${currency}`;
        return marketHistoryCache.fetch(key);
    });
}
export { networkHistoryCache, marketHistoryCache };
