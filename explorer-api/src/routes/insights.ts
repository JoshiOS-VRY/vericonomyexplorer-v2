import type { FastifyInstance } from "fastify";
import {
  createSwrCache,
  type CacheValue,
} from "../cache/swrCache.js";
import { registerChainScopedCache } from "../cache/registry.js";
import { fetchNetworkMetricHistory } from "../data/insightsNetwork.js";
import { fetchMarketHistory } from "../market/history.js";
import { parseChainId } from "../types.js";

const networkHistoryCache = createSwrCache({
  max: 32,
  ttlMs: 300_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, maxPoints, since, groupBy] = key.split(":");
    const result = await fetchNetworkMetricHistory(chainId, {
      maxPoints: maxPoints ? Number(maxPoints) : undefined,
      since: since ? Number(since) : undefined,
      groupBy: groupBy || undefined,
    });
    return result as CacheValue;
  },
});

const marketHistoryCache = createSwrCache({
  max: 16,
  ttlMs: 120_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, period, currency] = key.split(":");
    const result = await fetchMarketHistory(
      parseChainId(chainId) ?? "vrm",
      period as "7d" | "30d" | "90d" | "1y" | "all",
      currency as "usd" | "btc",
    );
    return result as unknown as CacheValue;
  },
});

registerChainScopedCache(networkHistoryCache);
registerChainScopedCache(marketHistoryCache);

export async function registerInsightsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { chain: string };
    Querystring: { maxPoints?: string; since?: string; groupBy?: string };
  }>("/v1/:chain/insights/network-history", async (request, reply) => {
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

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; currency?: string };
  }>("/v1/:chain/insights/market-history", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const period = (request.query.period ?? "30d") as "7d" | "30d" | "90d" | "1y" | "all";
    const currency = (request.query.currency ?? "usd") as "usd" | "btc";
    const key = `${chainId}:${period}:${currency}`;
    return marketHistoryCache.fetch(key);
  });
}

export { networkHistoryCache, marketHistoryCache };
