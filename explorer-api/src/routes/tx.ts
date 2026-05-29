import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import {
  fetchTransaction,
  fetchTransactionRelatedAddresses,
} from "../data/legacy.js";
import { parseChainId } from "../types.js";

const txCache = createSwrCache({
  max: 256,
  ttlMs: 120_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, txid] = key.split(":");
    return fetchTransaction(chainId, txid) as Promise<Record<string, unknown>>;
  },
});

const relatedCache = createSwrCache({
  max: 128,
  ttlMs: 60_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, txid, limit] = key.split(":");
    return fetchTransactionRelatedAddresses(chainId, txid, {
      limit: Number(limit) || 6,
    }) as Promise<Record<string, unknown>>;
  },
});

export async function registerTxRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chain: string; txid: string } }>(
    "/v1/:chain/tx/:txid",
    async (request, reply) => {
      const chainId = parseChainId(request.params.chain);
      if (!chainId) {
        return reply.code(400).send({ error: "Invalid chain id" });
      }
      return txCache.fetch(`${chainId}:${request.params.txid}`);
    },
  );

  app.get<{
    Params: { chain: string; txid: string };
    Querystring: { limit?: string };
  }>("/v1/:chain/tx/:txid/related-addresses", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const limit = Math.min(Math.max(Number(request.query.limit) || 6, 1), 25);
    return relatedCache.fetch(`${chainId}:${request.params.txid}:${limit}`);
  });
}
