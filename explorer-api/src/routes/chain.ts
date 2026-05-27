import type { FastifyInstance } from "fastify";
import type { LRUCache } from "lru-cache";
import { cacheKey, createSwrCache } from "../cache/swrCache.js";
import {
  fetchChainHealth,
  fetchChainActivityHistory,
  fetchChainSummary,
  fetchIndexerHealth,
  fetchLandingData,
} from "../data/legacy.js";
import { fetchVrmDashboardBundle } from "../data/vrmDashboard.js";
import { onAnyTip } from "../live/brokers.js";
import { parseChainId, type ChainId } from "../types.js";
import { homeCache } from "./home.js";

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
    return fetchVrmDashboardBundle();
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

const activityHistoryCache = createSwrCache({
  max: 32,
  ttlMs: 60_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, maxPoints, since] = key.split(":");
    return fetchChainActivityHistory(chainId, {
      maxPoints: maxPoints ? Number(maxPoints) : undefined,
      since: since ? Number(since) : undefined,
    });
  },
});

function safeCacheDelete(cache: LRUCache<string, unknown, unknown>, key: string): void {
  try {
    cache.delete(key);
  } catch {
    /* entry may be mid-fetch (lru-cache throws "deleted") */
  }
}

export function registerCacheInvalidation(): void {
  onAnyTip((chainId) => {
    for (const key of summaryCache.keys()) {
      if (key.startsWith(`${chainId}:`)) {
        safeCacheDelete(summaryCache, key);
      }
    }
    for (const key of activityHistoryCache.keys()) {
      if (key.startsWith(`${chainId}:`)) {
        safeCacheDelete(activityHistoryCache, key);
      }
    }
    safeCacheDelete(landingCache, "landing");
    safeCacheDelete(homeCache, "home");
    safeCacheDelete(dashboardCache, "dashboard");
    safeCacheDelete(healthCache, "health");
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

  app.get<{ Params: { chain: string }; Querystring: { maxPoints?: string; since?: string } }>(
    "/v1/:chain/activity-history",
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) {
        return reply.code(400).send({ error: "Invalid chain id" });
      }

      const maxPoints = request.query.maxPoints ?? "";
      const since = request.query.since ?? "";
      const key = `${chainId}:${maxPoints}:${since}`;
      return activityHistoryCache.fetch(key);
    },
  );

  app.get<{ Params: { chain: string } }>("/v1/:chain/blocks/latest", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }
    const summary = await summaryCache.fetch(cacheKey(chainId, "summary"));
    return summary.latestBlocks;
  });
}
