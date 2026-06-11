import type { FastifyInstance } from 'fastify';

import { cacheKey, createSwrCache, swrFetch, type CacheValue } from '../cache/swrCache.js';
import { registerChainScopedCache } from '../cache/registry.js';
import { parseChainId, type ChainId } from '../types.js';
import { buildChainPeers } from '../data/peers.js';

const peersCache = createSwrCache({
  max: 8,
  ttlMs: 20_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const [chainId, limit] = key.split(':');
    return {
      value: await buildChainPeers(chainId as ChainId, Number(limit) || 200),
    } as CacheValue;
  },
});

registerChainScopedCache(peersCache);

function clampLimit(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function registerPeersRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string }; Querystring: { limit?: string } }>(
    '/v1/:chain/peers',
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) return reply.code(400).send({ error: 'Invalid chain id' });
      const limit = clampLimit(request.query.limit, 200, 500);
      const result = await swrFetch(peersCache, cacheKey(chainId, 'peers', String(limit)), () =>
        buildChainPeers(chainId, limit).then((value) => ({ value }))
      );
      return (result as { value: unknown }).value;
    }
  );
}
