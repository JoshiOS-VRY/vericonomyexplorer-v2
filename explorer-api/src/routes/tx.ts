import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import { fetchTransaction } from "../data/legacy.js";
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
}
