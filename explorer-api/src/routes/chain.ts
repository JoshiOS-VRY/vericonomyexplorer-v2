import type { FastifyInstance } from "fastify";
import { cacheKey, createSwrCache } from "../cache/swrCache.js";
import {
  fetchChainHealth,
  fetchChainSummary,
  fetchIndexerHealth,
  fetchLandingData,
  fetchVrmDashboard,
} from "../data/legacy.js";
import { onAnyTip } from "../live/brokers.js";
import { parseChainId, type ChainId } from "../types.js";

const summaryCache = createSwrCache({
  max: 32,
  ttlMs: 5_000,
  fetch: async (key, signal) => {
    const chainId = key.split(":")[0] as ChainId;
    if (signal.aborted) throw new Error("aborted");
    return fetchChainSummary(chainId);
  },
});

const landingCache = createSwrCache({
  max: 4,
  ttlMs: 60_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    return fetchLandingData();
  },
});

const dashboardCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    return fetchVrmDashboard();
  },
});

const healthCache = createSwrCache({
  max: 8,
  ttlMs: 10_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    return fetchIndexerHealth();
  },
});

export function registerCacheInvalidation(): void {
  onAnyTip((chainId) => {
    for (const key of summaryCache.keys()) {
      if (key.startsWith(`${chainId}:`)) {
        summaryCache.delete(key);
      }
    }
    landingCache.delete("landing");
    dashboardCache.delete("dashboard");
    healthCache.delete("health");
  });
}

export async function registerChainRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/health", async () => ({
    ok: true,
    service: "explorer-api",
  }));

  app.get("/v1/indexer/status", async () => healthCache.fetch("health"));

  app.get("/v1/landing", async () => landingCache.fetch("landing"));

  app.get("/v1/vrm/dashboard", async () => dashboardCache.fetch("dashboard"));

  app.get<{ Params: { chain: string } }>("/v1/:chain/summary", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    return summaryCache.fetch(cacheKey(chainId, "summary"));
  });

  app.get<{ Params: { chain: string } }>("/v1/:chain/health", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    return fetchChainHealth(chainId);
  });

  app.get<{ Params: { chain: string } }>("/v1/:chain/blocks/latest", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    const summary = await summaryCache.fetch(cacheKey(chainId, "summary"));
    return summary.latestBlocks;
  });
}
