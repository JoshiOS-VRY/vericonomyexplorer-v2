import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import { registerChainScopedCache } from "../cache/registry.js";
import { fetchAddress, fetchBlock, fetchTransaction } from "../data/legacy.js";
import { searchQueryTimeoutMs } from "../db/queryPool.js";
import { parseChainId } from "../types.js";

const searchLookupOptions = { timeoutMs: searchQueryTimeoutMs };

const searchCache = createSwrCache({
  max: 256,
  ttlMs: 15_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, query] = key.split(":", 2);
    return (await resolveSearchPath(chainId, query)) as Record<string, unknown>;
  },
});

registerChainScopedCache(searchCache);

async function resolveSearchPath(chainId: string, query: string) {
  if (/^\d+$/.test(query)) {
    const block = (await fetchBlock(chainId, query, {
      limit: 1,
      offset: 0,
    })) as { found?: boolean };

    if (block.found) {
      return { path: `/${chainId}/block/${query}` };
    }

    return { path: null };
  }

  if (/^[a-fA-F0-9]{64}$/.test(query)) {
    const [tx, address] = await Promise.all([
      fetchTransaction(chainId, query, searchLookupOptions) as Promise<{ found?: boolean }>,
      fetchAddress(chainId, query, { limit: 1, includeRank: false }, searchLookupOptions) as Promise<{
        found?: boolean;
      }>,
    ]);

    if (tx.found) {
      return { path: `/${chainId}/tx/${query}` };
    }

    if (address.found) {
      return { path: `/${chainId}/address/${query}` };
    }

    return { path: `/${chainId}/block/${query}` };
  }

  const address = (await fetchAddress(
    chainId,
    query,
    { limit: 1, includeRank: false },
    searchLookupOptions,
  )) as { found?: boolean };

  if (address.found) {
    return { path: `/${chainId}/address/${query}` };
  }

  return { path: null };
}

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string }; Querystring: { q?: string } }>(
    "/v1/:chain/search",
    async (request, reply) => {
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
    },
  );
}
