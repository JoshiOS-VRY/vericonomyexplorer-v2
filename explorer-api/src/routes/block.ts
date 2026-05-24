import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import { fetchBlock } from "../data/legacy.js";
import { parseChainId } from "../types.js";

const blockCache = createSwrCache({
  max: 128,
  ttlMs: 60_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const [chainId, id] = key.split(":");
    return fetchBlock(chainId, id);
  },
});

export async function registerBlockRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { chain: string; hashOrHeight: string };
    Querystring: { limit?: string; offset?: string };
  }>("/v1/:chain/block/:hashOrHeight", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const offset = request.query.offset ? Number(request.query.offset) : undefined;
    const cacheKey = `${chainId}:${request.params.hashOrHeight}:${limit ?? ""}:${offset ?? ""}`;

    if (limit != null || offset != null) {
      return fetchBlock(chainId, request.params.hashOrHeight, { limit, offset });
    }

    return blockCache.fetch(cacheKey);
  });
}
