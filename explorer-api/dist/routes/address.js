import { heavyRateLimitRouteConfig } from "../env.js";
import { createSwrCache, swrFetch } from "../cache/swrCache.js";
import { fetchAddress, fetchAddressBalanceHistory, fetchAddressUtxos, } from "../data/legacy.js";
import { parseChainId } from "../types.js";
function parseIncludeRank(value) {
    return value === "1" || value === "true";
}
const addressCache = createSwrCache({
    max: 256,
    ttlMs: 5_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const parts = key.split(":");
        const chainId = parts[0];
        const address = parts[1];
        const limit = parts[2] ? Number(parts[2]) : undefined;
        const offset = parts[3] ? Number(parts[3]) : undefined;
        const includeRank = parts[4] === "1";
        return fetchAddress(chainId, address, { limit, offset, includeRank });
    },
});
const balanceHistoryCache = createSwrCache({
    max: 256,
    ttlMs: 5_000,
    useGlobalTtlOverride: false,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const parts = key.split(":");
        const chainId = parts[0];
        const address = parts[1];
        const maxPoints = parts[2] ? Number(parts[2]) : undefined;
        const since = parts[3] ? Number(parts[3]) : undefined;
        return fetchAddressBalanceHistory(chainId, address, { maxPoints, since });
    },
});
const utxosCache = createSwrCache({
    max: 256,
    ttlMs: 30_000,
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const parts = key.split(":");
        const chainId = parts[0];
        const address = parts[1];
        const limit = parts[2] ? Number(parts[2]) : undefined;
        const offset = parts[3] ? Number(parts[3]) : undefined;
        return fetchAddressUtxos(chainId, address, { limit, offset });
    },
});
export async function registerAddressRoutes(app) {
    app.get("/v1/:chain/address/:address", async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const limit = request.query.limit ? Number(request.query.limit) : undefined;
        const offset = request.query.offset ? Number(request.query.offset) : undefined;
        const includeRank = parseIncludeRank(request.query.includeRank);
        const key = `${chainId}:${request.params.address}:${limit ?? ""}:${offset ?? ""}:${includeRank ? "1" : "0"}`;
        return swrFetch(addressCache, key, () => fetchAddress(chainId, request.params.address, {
            limit,
            offset,
            includeRank,
        }));
    });
    app.get("/v1/:chain/address/:address/balance-history", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const maxPoints = request.query.maxPoints ? Number(request.query.maxPoints) : undefined;
        const since = request.query.since ? Number(request.query.since) : undefined;
        const key = `${chainId}:${request.params.address}:${maxPoints ?? ""}:${since ?? ""}`;
        return swrFetch(balanceHistoryCache, key, () => fetchAddressBalanceHistory(chainId, request.params.address, { maxPoints, since }));
    });
    app.get("/v1/:chain/address/:address/utxos", { ...heavyRateLimitRouteConfig }, async (request, reply) => {
        const chainId = parseChainId(request.params.chain);
        if (!chainId) {
            return reply.code(400).send({ error: "Invalid chain id" });
        }
        const limit = request.query.limit ? Number(request.query.limit) : undefined;
        const offset = request.query.offset ? Number(request.query.offset) : undefined;
        const key = `${chainId}:${request.params.address}:${limit ?? ""}:${offset ?? ""}`;
        return swrFetch(utxosCache, key, () => fetchAddressUtxos(chainId, request.params.address, { limit, offset }));
    });
}
