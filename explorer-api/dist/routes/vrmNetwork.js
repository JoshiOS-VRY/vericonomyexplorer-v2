import { createSwrCache, swrFetch } from '../cache/swrCache.js';
import { registerGlobalCache } from '../cache/registry.js';
import { registerGlobalTipRefresh } from '../cache/tipRefresh.js';
import { refreshCacheInBackground } from '../cache/swrCache.js';
import { fetchVrmNetworkStatsLite } from '../network/lite.js';
import { rpc } from '../rpc/index.js';
import { fetchCanonicalVrmHashrate } from '../network/hashrateLive.js';
import { parseRpcNumber } from '../network/stats.js';
import { NETWORK_HASHRATE_POLL_MS } from '@vericonomy/network-metrics';
/** Format on-chain VRM supply for external aggregators (VRM uses 8 decimal places). */
export function formatVrmSupplyResult(supply) {
    if (!Number.isFinite(supply) || supply < 0) {
        throw new Error('invalid supply');
    }
    return supply.toFixed(8).replace(/\.?0+$/, '') || '0';
}
async function fetchVrmSupplyPayload() {
    const stats = await fetchVrmNetworkStatsLite();
    const supply = stats.supply;
    if (supply == null || !Number.isFinite(supply) || supply <= 0) {
        throw new Error('VRM supply unavailable');
    }
    return { result: formatVrmSupplyResult(supply) };
}
const HOT_RPC_TIMEOUT_MS = Number(process.env.VCEXP_HOT_RPC_TIMEOUT_MS ?? 4_000);
function rpcCall() {
    const client = rpc('vrm');
    return (method, params = [], timeoutMs = HOT_RPC_TIMEOUT_MS) => client.call(method, params, timeoutMs);
}
async function fetchVrmNetworkHashratePayload() {
    const call = rpcCall();
    const resolved = await fetchCanonicalVrmHashrate(call);
    let difficulty = null;
    try {
        const blockchain = (await call('getblockchaininfo'));
        difficulty = parseRpcNumber(blockchain?.difficulty);
    }
    catch {
        /* optional */
    }
    return {
        hashPerSec: resolved.hashPerSec,
        hashrateKhPerMin: resolved.hashrateKhPerMin,
        source: resolved.source === 'none' ? null : resolved.source,
        difficulty,
        fetchedAt: new Date().toISOString(),
    };
}
const vrmHashrateCache = createSwrCache({
    max: 2,
    ttlMs: NETWORK_HASHRATE_POLL_MS,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error('aborted');
        const data = await fetchVrmNetworkHashratePayload();
        return data;
    },
});
registerGlobalCache(vrmHashrateCache);
registerGlobalTipRefresh('vrm-hashrate', () => refreshCacheInBackground(vrmHashrateCache, 'vrm-hashrate'));
const VRM_SUPPLY_CACHE_TTL_MS = Number(process.env.VCEXP_VRM_SUPPLY_CACHE_TTL_MS ?? 60_000);
const vrmSupplyCache = createSwrCache({
    max: 2,
    ttlMs: VRM_SUPPLY_CACHE_TTL_MS,
    fetch: async (_key, signal) => {
        if (signal.aborted)
            throw new Error('aborted');
        const data = await fetchVrmSupplyPayload();
        return data;
    },
});
registerGlobalCache(vrmSupplyCache);
registerGlobalTipRefresh('vrm-supply', () => refreshCacheInBackground(vrmSupplyCache, 'vrm-supply'));
export async function registerVrmNetworkRoutes(app) {
    app.get('/v1/vrm/network/hashrate', async () => swrFetch(vrmHashrateCache, 'vrm-hashrate', fetchVrmNetworkHashratePayload));
    /** Public circulating/total supply for aggregators (CoinGecko-compatible `{ result }` shape). */
    app.get('/v1/vrm/supply', async (_request, reply) => {
        try {
            return await swrFetch(vrmSupplyCache, 'vrm-supply', fetchVrmSupplyPayload);
        }
        catch {
            return reply.code(503).send({ error: 'VRM supply unavailable' });
        }
    });
}
export { vrmHashrateCache, fetchVrmNetworkHashratePayload, vrmSupplyCache, fetchVrmSupplyPayload };
