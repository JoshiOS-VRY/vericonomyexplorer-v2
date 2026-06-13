import type { FastifyInstance } from 'fastify';

import {
  healthRateLimitRouteConfig,
  heavyRateLimitRouteConfig,
  liveReadRateLimitRouteConfig,
} from '../env.js';

import {
  cacheKey,
  createSwrCache,
  refreshCacheInBackground,
  swrFetch,
  type CacheValue,
} from '../cache/swrCache.js';

import { registerChainScopedCache, registerGlobalCache } from '../cache/registry.js';

import {
  registerChainTipRefresh,
  registerGlobalTipRefresh,
  refreshOnTip,
} from '../cache/tipRefresh.js';

import { refreshChainCachesOnTip } from '../data/chainCacheRefresh.js';

import {
  fetchChainHealth,
  fetchChainActivityHistory,
  fetchChainSummary,
  fetchChainSummaryLite,
  fetchIndexerHealth,
  fetchLandingData,
  fetchLatestBlocks,
  fetchBlocksPage,
} from '../data/legacy.js';

import { fetchVrmDashboardBundle } from '../data/vrmDashboard.js';

import { onAnyTip } from '../live/brokers.js';

function latestBlocksLimit(value: string | undefined): number {
  const parsed = Number(value ?? 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }
  return Math.min(Math.floor(parsed), 25);
}

import { parseChainId, type ChainId } from '../types.js';

import { homeCache, homeShellCache } from './home.js';

export const summaryCache = createSwrCache({
  max: 32,

  ttlMs: 10_000,
  useGlobalTtlOverride: false,

  fetch: async (key, signal) => {
    const chainId = key.split(':')[0] as ChainId;

    if (signal.aborted) throw new Error('aborted');

    return (await fetchChainSummary(chainId)) as CacheValue;
  },
});

export const summaryLiteCache = createSwrCache({
  max: 32,

  ttlMs: 10_000,
  useGlobalTtlOverride: false,

  fetch: async (key, signal) => {
    const chainId = key.split(':')[0] as ChainId;

    if (signal.aborted) throw new Error('aborted');

    return (await fetchChainSummaryLite(chainId)) as CacheValue;
  },
});

export const latestBlocksCache = createSwrCache({
  max: 32,

  ttlMs: 2_000,

  fetch: async (key, signal) => {
    const chainId = key.split(':')[0] as ChainId;

    if (signal.aborted) throw new Error('aborted');

    const blocks = await fetchLatestBlocks(chainId);

    return { blocks } as CacheValue;
  },
});

export const blocksPageCache = createSwrCache({
  max: 64,

  ttlMs: 5_000,

  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    const [chainId, , limit, offset] = key.split(':');

    return (await fetchBlocksPage(chainId as ChainId, {
      limit,

      offset,
    })) as CacheValue;
  },
});

const landingCache = createSwrCache({
  max: 4,

  ttlMs: 60_000,

  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    return (await fetchLandingData()) as CacheValue;
  },
});

const dashboardCache = createSwrCache({
  max: 4,

  ttlMs: 30_000,

  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    return (await fetchVrmDashboardBundle()) as CacheValue;
  },
});

const healthCache = createSwrCache({
  max: 8,

  ttlMs: 10_000,

  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    return (await fetchIndexerHealth()) as CacheValue;
  },
});

export const chainHealthCache = createSwrCache({
  max: 8,

  ttlMs: 10_000,

  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    const chainId = key.split(':')[0] as ChainId;

    return (await fetchChainHealth(chainId)) as CacheValue;
  },
});

export const activityHistoryCache = createSwrCache({
  max: 32,

  ttlMs: 60_000,

  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');

    const [chainId, maxPoints, since] = key.split(':');

    const result = await fetchChainActivityHistory(chainId, {
      maxPoints: maxPoints ? Number(maxPoints) : undefined,

      since: since ? Number(since) : undefined,
    });

    return result as CacheValue;
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
  await refreshCacheInBackground(chainHealthCache, cacheKey(chainId, 'health'));
});

registerGlobalTipRefresh('landing', () => refreshCacheInBackground(landingCache, 'landing'));

registerGlobalTipRefresh('dashboard', () => refreshCacheInBackground(dashboardCache, 'dashboard'));

registerGlobalTipRefresh('health', () => refreshCacheInBackground(healthCache, 'health'));

export function registerCacheInvalidation(): void {
  onAnyTip((chainId) => {
    refreshOnTip(chainId);
  });
}

export async function registerChainRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/health', { ...healthRateLimitRouteConfig }, async () => ({
    ok: true,

    service: 'explorer-api',
  }));

  app.get('/v1/indexer/status', async () => swrFetch(healthCache, 'health', fetchIndexerHealth));

  app.get('/v1/landing', async () => swrFetch(landingCache, 'landing', fetchLandingData));

  app.get('/v1/vrm/dashboard', async () =>
    swrFetch(dashboardCache, 'dashboard', fetchVrmDashboardBundle)
  );

  app.get<{ Params: { chain: string } }>('/v1/:chain/summary', async (request, reply) => {
    const chainId = parseChainId(request.params.chain);

    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }

    return swrFetch(summaryCache, cacheKey(chainId, 'summary'), () => fetchChainSummary(chainId));
  });

  app.get<{ Params: { chain: string } }>(
    '/v1/:chain/summary/lite',
    { ...liveReadRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);

      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      return swrFetch(summaryLiteCache, cacheKey(chainId, 'summary-lite'), () =>
        fetchChainSummaryLite(chainId)
      );
    }
  );

  app.get<{ Params: { chain: string } }>(
    '/v1/:chain/health',
    { ...healthRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);

      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      return chainHealthCache.fetch(cacheKey(chainId, 'health'));
    }
  );

  app.get<{ Params: { chain: string }; Querystring: { maxPoints?: string; since?: string } }>(
    '/v1/:chain/activity-history',

    { ...heavyRateLimitRouteConfig },

    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);

      if (!chainId) {
        return reply.code(400).send({ error: 'Invalid chain id' });
      }

      const maxPoints = request.query.maxPoints ?? '';

      const since = request.query.since ?? '';

      const cappedMaxPoints = maxPoints
        ? String(Math.min(Math.max(Number(maxPoints) || 120, 2), 120))
        : '';

      const key = `${chainId}:${cappedMaxPoints}:${since}`;

      return swrFetch(activityHistoryCache, key, () =>
        fetchChainActivityHistory(chainId, {
          maxPoints: cappedMaxPoints ? Number(cappedMaxPoints) : undefined,
          since: since ? Number(since) : undefined,
        })
      );
    }
  );

  app.get<{
    Params: { chain: string };
    Querystring: { limit?: string };
  }>('/v1/:chain/blocks/latest', { ...liveReadRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);

    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }

    const limit = latestBlocksLimit(request.query.limit);

    const cached = await swrFetch(
      latestBlocksCache,

      cacheKey(chainId, 'latest-blocks', String(limit)),

      async () => ({ blocks: await fetchLatestBlocks(chainId, { limit }) })
    );

    return (cached as { blocks?: unknown[] }).blocks ?? [];
  });

  app.get<{
    Params: { chain: string };
    Querystring: { limit?: string; offset?: string };
  }>('/v1/:chain/blocks', async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }

    const limit = request.query.limit ?? '';
    const offset = request.query.offset ?? '';

    return swrFetch(blocksPageCache, cacheKey(chainId, 'blocks', `${limit}:${offset}`), () =>
      fetchBlocksPage(chainId, { limit, offset })
    );
  });
}
