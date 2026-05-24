import type { FastifyInstance } from "fastify";
import { fetchAddress, fetchTransaction } from "../data/legacy.js";
import { parseChainId } from "../types.js";

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

      if (/^\d+$/.test(query)) {
        return { path: `/${chainId}/block/${query}` };
      }

      if (/^[a-fA-F0-9]{64}$/.test(query)) {
        const tx = await fetchTransaction(chainId, query);
        if (tx.found) {
          return { path: `/${chainId}/tx/${query}` };
        }
        return { path: `/${chainId}/block/${query}` };
      }

      const address = await fetchAddress(chainId, query, { limit: 1 });
      if (address.found) {
        return { path: `/${chainId}/address/${query}` };
      }

      return { path: null };
    },
  );
}
