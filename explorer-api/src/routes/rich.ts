import type { FastifyInstance } from 'fastify';
import { heavyRateLimitRouteConfig } from '../env.js';
import { createSwrCache, swrFetch } from '../cache/swrCache.js';
import {
  fetchLeaderboard,
  fetchMinedLeaderboard,
  fetchMinerBlockDistribution,
  fetchMinerShareTrend,
  fetchRichlist,
} from '../data/legacy.js';
import { parseChainId } from '../types.js';
import { withTimeout } from '../util/timeout.js';

const heavyRouteTimeoutMs = Number(process.env.VCEXP_API_HEAVY_ROUTE_TIMEOUT_MS ?? 5_000);

const richlistCache = createSwrCache({
  max: 32,
  ttlMs: 10_000,
  useGlobalTtlOverride: false,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const [chainId, limit, offset] = key.split(':');
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
    if (signal.aborted) throw new Error('aborted');
    const [chainId, period, sort, limit, offset] = key.split(':');
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
    if (signal.aborted) throw new Error('aborted');
    const [chainId, period, limit, offset] = key.split(':');
    return fetchMinedLeaderboard(chainId, {
      period: period || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    }) as Promise<Record<string, unknown>>;
  },
});

const minersChartsCache = createSwrCache({
  max: 32,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const [kind, chainId, ...rest] = key.split(':');
    if (kind === 'share') {
      const [period, top] = rest;
      return fetchMinerShareTrend(chainId, {
        period: period || undefined,
        top: top ? Number(top) : undefined,
      }) as Promise<Record<string, unknown>>;
    }
    const [blocks, top] = rest;
    return fetchMinerBlockDistribution(chainId, {
      blocks: blocks ? Number(blocks) : undefined,
      top: top ? Number(top) : undefined,
    }) as Promise<Record<string, unknown>>;
  },
});

export async function registerRichRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { chain: string };
    Querystring: { limit?: string; offset?: string };
  }>('/v1/:chain/richlist', { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }
    const key = `${chainId}:${request.query.limit ?? ''}:${request.query.offset ?? ''}`;
    return swrFetch(richlistCache, key, () =>
      fetchRichlist(chainId, {
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      })
    );
  });

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; sort?: string; limit?: string; offset?: string };
  }>('/v1/:chain/leaderboard', { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }
    const key = `${chainId}:${request.query.period ?? ''}:${request.query.sort ?? ''}:${request.query.limit ?? ''}:${request.query.offset ?? ''}`;
    try {
      return await withTimeout(leaderboardCache.fetch(key), heavyRouteTimeoutMs, 'leaderboard');
    } catch {
      const stale = leaderboardCache.get(key, { allowStale: true });
      if (stale) return stale;
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

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; limit?: string; offset?: string };
  }>('/v1/:chain/miners', { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }
    const key = `${chainId}:${request.query.period ?? ''}:${request.query.limit ?? ''}:${request.query.offset ?? ''}`;
    try {
      return await withTimeout(minersCache.fetch(key), heavyRouteTimeoutMs, 'miners');
    } catch {
      const stale = minersCache.get(key, { allowStale: true });
      if (stale) return stale;
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

  app.get<{
    Params: { chain: string };
    Querystring: { period?: string; top?: string };
  }>('/v1/:chain/miners/share-trend', { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }
    const key = `share:${chainId}:${request.query.period ?? ''}:${request.query.top ?? ''}`;
    try {
      return await withTimeout(
        minersChartsCache.fetch(key),
        heavyRouteTimeoutMs,
        'miners-share-trend'
      );
    } catch {
      const stale = minersChartsCache.get(key, { allowStale: true });
      if (stale) return stale;
      return fetchMinerShareTrend(chainId, {
        period: request.query.period,
        top: request.query.top ? Number(request.query.top) : undefined,
      }).catch(() => ({
        chainId,
        enabled: true,
        trusted: false,
        series: [],
        points: [],
      }));
    }
  });

  app.get<{
    Params: { chain: string };
    Querystring: { blocks?: string; top?: string };
  }>('/v1/:chain/miners/distribution', { ...heavyRateLimitRouteConfig }, async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: 'Invalid chain id' });
    }
    const key = `distribution:${chainId}:${request.query.blocks ?? ''}:${request.query.top ?? ''}`;
    try {
      return await withTimeout(
        minersChartsCache.fetch(key),
        heavyRouteTimeoutMs,
        'miners-distribution'
      );
    } catch {
      const stale = minersChartsCache.get(key, { allowStale: true });
      if (stale) return stale;
      return fetchMinerBlockDistribution(chainId, {
        blocks: request.query.blocks ? Number(request.query.blocks) : undefined,
        top: request.query.top ? Number(request.query.top) : undefined,
      }).catch(() => ({
        chainId,
        enabled: true,
        trusted: false,
        segments: [],
        totalBlocks: 0,
      }));
    }
  });
}
