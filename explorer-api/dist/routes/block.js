import { createSwrCache, swrFetch } from '../cache/swrCache.js';
import { registerChainScopedCache } from '../cache/registry.js';
import { fetchBlock } from '../data/legacy.js';
import { parseChainId } from '../types.js';
export const blockCache = createSwrCache({
    max: 128,
    ttlMs: 5_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error('aborted');
        const parts = key.split(':');
        const chainId = parts[0];
        const hashOrHeight = parts[1];
        const limit = parts[2] ? Number(parts[2]) : undefined;
        const offset = parts[3] ? Number(parts[3]) : undefined;
        return fetchBlock(chainId, hashOrHeight, { limit, offset });
    },
});
registerChainScopedCache(blockCache);
export async function registerBlockRoutes(app) {
    app.get('/v1/:chain/block/:hashOrHeight', async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: 'Invalid chain id' });
        }
        const limit = request.query.limit ? Number(request.query.limit) : undefined;
        const offset = request.query.offset ? Number(request.query.offset) : undefined;
        const key = `${chainId}:${request.params.hashOrHeight}:${limit ?? ''}:${offset ?? ''}`;
        return swrFetch(blockCache, key, () => fetchBlock(chainId, request.params.hashOrHeight, { limit, offset }));
    });
}
