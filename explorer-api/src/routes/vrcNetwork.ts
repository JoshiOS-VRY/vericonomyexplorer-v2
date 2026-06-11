import type { FastifyInstance } from 'fastify';
import { createSwrCache, swrFetch } from '../cache/swrCache.js';
import { registerGlobalCache } from '../cache/registry.js';
import { registerGlobalTipRefresh } from '../cache/tipRefresh.js';
import { refreshCacheInBackground } from '../cache/swrCache.js';
import { fetchVrcNetworkStatsLite } from '../network/lite.js';

/** CoinGecko-style supply payload: `{ "result": "<amount>" }` with up to 8 decimal places. */
export type VrcSupplyPayload = { result: string };

/** Format on-chain VRC supply for external aggregators (VRC uses 8 decimal places). */
export function formatVrcSupplyResult(supply: number): string {
  if (!Number.isFinite(supply) || supply < 0) {
    throw new Error('invalid supply');
  }
  return supply.toFixed(8).replace(/\.?0+$/, '') || '0';
}

async function fetchVrcSupplyPayload(): Promise<VrcSupplyPayload> {
  const stats = await fetchVrcNetworkStatsLite();
  const supply = stats.supply;
  if (supply == null || !Number.isFinite(supply) || supply <= 0) {
    throw new Error('VRC supply unavailable');
  }
  return { result: formatVrcSupplyResult(supply) };
}

const VRC_SUPPLY_CACHE_TTL_MS = Number(process.env.VCEXP_VRC_SUPPLY_CACHE_TTL_MS ?? 60_000);

const vrcSupplyCache = createSwrCache({
  max: 2,
  ttlMs: VRC_SUPPLY_CACHE_TTL_MS,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error('aborted');
    const data = await fetchVrcSupplyPayload();
    return data as unknown as Record<string, unknown>;
  },
});

registerGlobalCache(vrcSupplyCache);
registerGlobalTipRefresh('vrc-supply', () =>
  refreshCacheInBackground(vrcSupplyCache, 'vrc-supply')
);

export async function registerVrcNetworkRoutes(app: FastifyInstance): Promise<void> {
  /** Public circulating/total supply for aggregators (CoinGecko-compatible `{ result }` shape). */
  app.get('/v1/vrc/supply', async (_request, reply) => {
    try {
      return await swrFetch(vrcSupplyCache, 'vrc-supply', fetchVrcSupplyPayload);
    } catch {
      return reply.code(503).send({ error: 'VRC supply unavailable' });
    }
  });
}

export { vrcSupplyCache, fetchVrcSupplyPayload };
