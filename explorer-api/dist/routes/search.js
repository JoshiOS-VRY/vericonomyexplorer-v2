import { createSwrCache } from "../cache/swrCache.js";
import { registerChainScopedCache } from "../cache/registry.js";
import { fetchAddress, fetchTransaction } from "../data/legacy.js";
import { parseChainId } from "../types.js";
const searchCache = createSwrCache({
    max: 256,
    ttlMs: 15_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, query] = key.split(":", 2);
        return (await resolveSearchPath(chainId, query));
    },
});
registerChainScopedCache(searchCache);
async function resolveSearchPath(chainId, query) {
    if (/^\d+$/.test(query)) {
        return { path: `/${chainId}/block/${query}` };
    }
    if (/^[a-fA-F0-9]{64}$/.test(query)) {
        const [tx, address] = await Promise.all([
            fetchTransaction(chainId, query),
            fetchAddress(chainId, query, { limit: 1, includeRank: false }),
        ]);
        if (tx.found) {
            return { path: `/${chainId}/tx/${query}` };
        }
        if (address.found) {
            return { path: `/${chainId}/address/${query}` };
        }
        return { path: `/${chainId}/block/${query}` };
    }
    const address = (await fetchAddress(chainId, query, {
        limit: 1,
        includeRank: false,
    }));
    if (address.found) {
        return { path: `/${chainId}/address/${query}` };
    }
    return { path: null };
}
export async function registerSearchRoutes(app) {
    app.get("/v1/:chain/search", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const query = (request.query.q ?? "").trim();
        if (!query) {
            return reply.code(400).send({ error: "Missing query" });
        }
        const key = `${chainId}:${query}`;
        return searchCache.fetch(key);
    });
}
