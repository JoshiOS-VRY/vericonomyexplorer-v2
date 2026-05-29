import type { FastifyInstance } from "fastify";
import { heavyRateLimitRouteConfig } from "../env.js";
import { createSwrCache } from "../cache/swrCache.js";
import { fetchLeaderboard, fetchMinedLeaderboard, fetchRichlist } from "../data/legacy.js";
import { parseChainId } from "../types.js";

const richlistCache = createSwrCache({
  max: 32,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, limit, offset] = key.split(":");
    return fetchRichlist(chainId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    }) as Promise<Record<string, unknown>>;
  },
});

const leaderboardCache = createSwrCache({
  max: 32,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, period, sort, limit, offset] = key.split(":");
    return fetchLeaderboard(chainId, {
      period: period || undefined,
      sort: sort || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    }) as Promise<Record<string, unknown>>;
  },
});

const minersCache = createSwrCache({
  max: 32,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, period, limit, offset] = key.split(":");
    return fetchMinedLeaderboard(chainId, {
      period: period || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    }) as Promise<Record<string, unknown>>;
  },
});

export async function registerRichRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { chain: string };
    Querystring: { limit?: string; offset?: string };
  }>("/v1/:chain/richlist", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    const key = `${chainId}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
    return richlistCache.fetch(key);
  });

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; sort?: string; limit?: string; offset?: string };
  }>("/v1/:chain/leaderboard", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    const key = `${chainId}:${request.query.period ?? ""}:${request.query.sort ?? ""}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
    return leaderboardCache.fetch(key);
  });

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; limit?: string; offset?: string };
  }>("/v1/:chain/miners", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    const key = `${chainId}:${request.query.period ?? ""}:${request.query.limit ?? ""}:${request.query.offset ?? ""}`;
    return minersCache.fetch(key);
  });
}
