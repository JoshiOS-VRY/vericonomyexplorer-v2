import type { FastifyInstance } from 'fastify';

import { heavyRateLimitRouteConfig } from '../env.js';
import { cacheKey, createSwrCache, swrFetch, type CacheValue } from '../cache/swrCache.js';
import { registerChainScopedCache } from '../cache/registry.js';
import { parseChainId, type ChainId } from '../types.js';
import {
  buildWalletBlocks,
  buildWalletChainTips,
  buildWalletExtraction,
  buildWalletPeers,
  buildWalletStats,
  buildWalletTransactions,
} from '../data/walletCompat.js';

/** Keys are `{chain}:{resource}:{suffix}` — suffix may contain colons (e.g. `week:20`). */
function parseWalletCacheKey(key: string): {
  chainId: ChainId;
  suffix: string;
} {
  const parts = key.split(':');
  return {
    chainId: parts[0] as ChainId,
    suffix: parts.slice(2).join(':'),
  };
}

// The wallet wraps each compat response in its own 30s cache, so short server
// TTLs here mainly protect node RPC / the indexer from request bursts.
const statsCache = createSwrCache({
  max: 8,
  ttlMs: 15_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const chainId = key.split(':')[0] as ChainId;
    return { value: await buildWalletStats(chainId) } as CacheValue;
  },
});

const blocksCache = createSwrCache({
  max: 16,
  ttlMs: 10_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const { chainId, suffix } = parseWalletCacheKey(key);
    return {
      value: await buildWalletBlocks(chainId, Number(suffix) || 100),
    } as CacheValue;
  },
});

const transactionsCache = createSwrCache({
  max: 16,
  ttlMs: 15_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const { chainId, suffix } = parseWalletCacheKey(key);
    return {
      value: await buildWalletTransactions(chainId, Number(suffix) || 25),
    } as CacheValue;
  },
});

const extractionCache = createSwrCache({
  max: 32,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const { chainId, suffix } = parseWalletCacheKey(key);
    const [period, limitRaw] = suffix.split(':');
    return {
      value: await buildWalletExtraction(chainId, Number(limitRaw) || 20, period || 'month'),
    } as CacheValue;
  },
});

const chainCache = createSwrCache({
  max: 8,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const chainId = key.split(':')[0] as ChainId;
    return { value: await buildWalletChainTips(chainId) } as CacheValue;
  },
});

const peersCache = createSwrCache({
  max: 8,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const { chainId, suffix } = parseWalletCacheKey(key);
    return {
      value: await buildWalletPeers(chainId, Number(suffix) || 50),
    } as CacheValue;
  },
});

registerChainScopedCache(statsCache);
registerChainScopedCache(blocksCache);
registerChainScopedCache(transactionsCache);
registerChainScopedCache(extractionCache);
registerChainScopedCache(chainCache);
registerChainScopedCache(peersCache);

function clampLimit(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function registerWalletRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string } }>('/v1/:chain/wallet/stats', async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
    const result = await swrFetch(statsCache, cacheKey(chainId, 'wallet-stats'), () =>
      buildWalletStats(chainId).then((value) => ({ value }))
    );
    return (result as { value: unknown }).value;
  });

  app.get<{ Params: { chain: string }; Querystring: { limit?: string } }>(
    '/v1/:chain/wallet/blocks',
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
      const limit = clampLimit(request.query.limit, 100, 100);
      const result = await swrFetch(
        blocksCache,
        cacheKey(chainId, 'wallet-blocks', String(limit)),
        () => buildWalletBlocks(chainId, limit).then((value) => ({ value }))
      );
      return (result as { value: unknown }).value;
    }
  );

  app.get<{ Params: { chain: string }; Querystring: { limit?: string } }>(
    '/v1/:chain/wallet/transactions',
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
      const limit = clampLimit(request.query.limit, 25, 100);
      const result = await swrFetch(
        transactionsCache,
        cacheKey(chainId, 'wallet-transactions', String(limit)),
        () => buildWalletTransactions(chainId, limit).then((value) => ({ value }))
      );
      return (result as { value: unknown }).value;
    }
  );

  app.get<{ Params: { chain: string }; Querystring: { limit?: string; period?: string } }>(
    '/v1/:chain/wallet/extraction',
    { ...heavyRateLimitRouteConfig },
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
      const limit = clampLimit(request.query.limit, 20, 100);
      const period = (request.query.period || 'month').trim().toLowerCase();
      const result = await swrFetch(
        extractionCache,
        cacheKey(chainId, 'wallet-extraction', `${period}:${limit}`),
        () => buildWalletExtraction(chainId, limit, period).then((value) => ({ value }))
      );
      return (result as { value: unknown }).value;
    }
  );

  app.get<{ Params: { chain: string } }>('/v1/:chain/wallet/chain', async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
    const result = await swrFetch(chainCache, cacheKey(chainId, 'wallet-chain'), () =>
      buildWalletChainTips(chainId).then((value) => ({ value }))
    );
    return (result as { value: unknown }).value;
  });

  app.get<{ Params: { chain: string }; Querystring: { limit?: string } }>(
    '/v1/:chain/wallet/peers',
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
      const limit = clampLimit(request.query.limit, 50, 200);
      const result = await swrFetch(
        peersCache,
        cacheKey(chainId, 'wallet-peers', String(limit)),
        () => buildWalletPeers(chainId, limit).then((value) => ({ value }))
      );
      return (result as { value: unknown }).value;
    }
  );
}
