import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import { fetchAddress } from "../data/legacy.js";
import { parseChainId } from "../types.js";

const addressCache = createSwrCache({
  max: 256,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const parts = key.split(":");
    const chainId = parts[0];
    const address = parts[1];
    const limit = parts[2] ? Number(parts[2]) : undefined;
    const offset = parts[3] ? Number(parts[3]) : undefined;
    return fetchAddress(chainId, address, { limit, offset });
  },
});

export async function registerAddressRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { chain: string; address: string };
    Querystring: { limit?: string; offset?: string };
  }>("/v1/:chain/address/:address", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const offset = request.query.offset ? Number(request.query.offset) : undefined;
    const key = `${chainId}:${request.params.address}:${limit ?? ""}:${offset ?? ""}`;
    return addressCache.fetch(key);
  });
}
