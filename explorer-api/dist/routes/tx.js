import { heavyRateLimitRouteConfig } from "../env.js";
import { createSwrCache, swrFetch } from "../cache/swrCache.js";
import { fetchTransaction, fetchTransactionRelatedAddresses, } from "../data/legacy.js";
import { parseChainId } from "../types.js";
const txCache = createSwrCache({
    max: 256,
    ttlMs: 5_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, txid] = key.split(":");
        return fetchTransaction(chainId, txid);
    },
});
const relatedCache = createSwrCache({
    max: 128,
    ttlMs: 5_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, txid, limit] = key.split(":");
        return fetchTransactionRelatedAddresses(chainId, txid, {
            limit: Number(limit) || 6,
        });
    },
});
export async function registerTxRoutes(app) {
    app.get("/v1/:chain/tx/:txid", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const key = `${chainId}:${request.params.txid}`;
        return swrFetch(txCache, key, () => fetchTransaction(chainId, request.params.txid));
    });
    app.get("/v1/:chain/tx/:txid/related-addresses", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const limit = Math.min(Math.max(Number(request.query.limit) || 6, 1), 25);
        const key = `${chainId}:${request.params.txid}:${limit}`;
        return swrFetch(relatedCache, key, () => fetchTransactionRelatedAddresses(chainId, request.params.txid, { limit }));
    });
}
