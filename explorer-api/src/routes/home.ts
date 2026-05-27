import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import {
  fetchHomeData,
  fetchHomeMarketOnly,
  fetchHomeNetwork,
  fetchHomeShell,
} from "../data/home.js";
import { onAnyTip } from "../live/brokers.js";

const homeCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const data = await fetchHomeData();
    return data as unknown as Record<string, unknown>;
  },
});

const homeShellCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const data = await fetchHomeShell();
    return data as unknown as Record<string, unknown>;
  },
});

const homeNetworkCache = createSwrCache({
  max: 4,
  ttlMs: 120_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const data = await fetchHomeNetwork();
    return data as unknown as Record<string, unknown>;
  },
});

const homeMarketCache = createSwrCache({
  max: 4,
  ttlMs: Number(process.env.VCEXP_MARKET_CACHE_TTL_MS) || 120_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const data = await fetchHomeMarketOnly();
    return data as unknown as Record<string, unknown>;
  },
});

export function registerHomeCacheInvalidation(): void {
  onAnyTip(() => {
    homeCache.delete("home");
    homeShellCache.delete("shell");
  });
}

export async function registerHomeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/home", async () => {
    const data = await homeCache.fetch("home");
    return data ?? fetchHomeData();
  });

  app.get("/v1/home/shell", async () => {
    const data = await homeShellCache.fetch("shell");
    return data ?? fetchHomeShell();
  });

  app.get("/v1/home/network", async () => {
    const data = await homeNetworkCache.fetch("network");
    return data ?? fetchHomeNetwork();
  });

  app.get("/v1/home/market", async () => {
    const data = await homeMarketCache.fetch("market");
    return data ?? fetchHomeMarketOnly();
  });
}

export { homeCache, homeMarketCache, homeNetworkCache, homeShellCache };
