import type { FastifyInstance } from 'fastify';
import { createSwrCache, refreshCacheInBackground, swrFetch } from '../cache/swrCache.js';
import { registerGlobalCache } from '../cache/registry.js';
import { registerGlobalTipRefresh } from '../cache/tipRefresh.js';
import {
  fetchHomeData,
  fetchHomeMarketOnly,
  fetchHomeNetwork,
  fetchHomeNetworkLite,
  fetchHomeShell,
} from '../data/home.js';
import { fetchLandingData } from '../data/legacy.js';
import { withTimeout } from '../util/timeout.js';

const homeNetworkRouteTimeoutMs = Number(process.env.VCEXP_HOME_NETWORK_ROUTE_TIMEOUT_MS ?? 4_000);
const homeMarketRouteTimeoutMs = Number(process.env.VCEXP_HOME_MARKET_ROUTE_TIMEOUT_MS ?? 4_000);
const homeShellRouteTimeoutMs = Number(process.env.VCEXP_HOME_SHELL_ROUTE_TIMEOUT_MS ?? 5_000);

const homeCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const data = await fetchHomeData();
    return data as unknown as Record<string, unknown>;
  },
});

const homeShellCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const data = await fetchHomeShell();
    return data as unknown as Record<string, unknown>;
  },
});

const homeNetworkCache = createSwrCache({
  max: 4,
  ttlMs: 30_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const data = await fetchHomeNetwork();
    return data as unknown as Record<string, unknown>;
  },
});

const homeMarketCache = createSwrCache({
  max: 4,
  ttlMs: Number(process.env.VCEXP_MARKET_CACHE_TTL_MS) || 120_000,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const data = await fetchHomeMarketOnly();
    return data as unknown as Record<string, unknown>;
  },
});

registerGlobalCache(homeCache);
registerGlobalCache(homeShellCache);
registerGlobalCache(homeNetworkCache);
registerGlobalCache(homeMarketCache);

registerGlobalTipRefresh('home', () => refreshCacheInBackground(homeCache, 'home'));
registerGlobalTipRefresh('shell', () => refreshCacheInBackground(homeShellCache, 'shell'));
registerGlobalTipRefresh('network', () => refreshCacheInBackground(homeNetworkCache, 'network'));

export function registerHomeCacheInvalidation(): void {
  /* home/shell/network refresh is registered via registerGlobalTipRefresh above */
}

export async function registerHomeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/home', async () => swrFetch(homeCache, 'home', fetchHomeData));

  app.get('/v1/home/shell', async () => {
    const stale = homeShellCache.get('shell', { allowStale: true }) as
      | Record<string, unknown>
      | undefined;

    try {
      return await withTimeout(
        swrFetch(homeShellCache, 'shell', fetchHomeShell),
        homeShellRouteTimeoutMs,
        'home/shell'
      );
    } catch {
      if (stale) {
        return stale;
      }

      const landing = await fetchLandingData().catch(() => null);
      if (landing) {
        return {
          vrm: {
            summary: landing.vrmSummary,
            richlist: landing.vrmRichlist,
          },
          vrc: {
            summary: landing.vrcSummary,
            richlist: landing.vrcRichlist,
          },
          vrmLeaderboard: landing.vrmLeaderboard,
          fetchedAt: new Date().toISOString(),
        };
      }

      throw new Error('home/shell unavailable');
    }
  });

  app.get('/v1/home/network', async () => {
    const stale = homeNetworkCache.get('network', { allowStale: true }) as
      | Record<string, unknown>
      | undefined;

    try {
      return await withTimeout(
        swrFetch(homeNetworkCache, 'network', fetchHomeNetwork),
        homeNetworkRouteTimeoutMs,
        'home/network'
      );
    } catch {
      if (stale) {
        return stale;
      }

      return fetchHomeNetworkLite();
    }
  });

  app.get('/v1/home/market', async () => {
    const stale = homeMarketCache.get('market', { allowStale: true }) as
      | Record<string, unknown>
      | undefined;

    try {
      return await withTimeout(
        swrFetch(homeMarketCache, 'market', fetchHomeMarketOnly),
        homeMarketRouteTimeoutMs,
        'home/market'
      );
    } catch {
      if (stale) {
        return stale;
      }

      const { emptyMarket } = await import('../market/index.js');
      return {
        vrm: emptyMarket(),
        vrc: emptyMarket(),
        fetchedAt: new Date().toISOString(),
      };
    }
  });
}

export { homeCache, homeMarketCache, homeNetworkCache, homeShellCache };
