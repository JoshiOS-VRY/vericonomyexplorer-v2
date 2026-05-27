import type { FastifyInstance } from "fastify";
import { createSwrCache } from "../cache/swrCache.js";
import {
  fetchAddress,
  fetchAddressBalanceHistory,
  fetchAddressUtxos,
} from "../data/legacy.js";
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
    return fetchAddress(chainId, address, { limit, offset }) as Promise<Record<string, unknown>>;
  },
});

const balanceHistoryCache = createSwrCache({
  max: 256,
  ttlMs: 60_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const parts = key.split(":");
    const chainId = parts[0];
    const address = parts[1];
    const maxPoints = parts[2] ? Number(parts[2]) : undefined;
    const since = parts[3] ? Number(parts[3]) : undefined;
    return fetchAddressBalanceHistory(chainId, address, { maxPoints, since }) as Promise<
      Record<string, unknown>
    >;
  },
});

const utxosCache = createSwrCache({
  max: 256,
  ttlMs: 30_000,
  fetch: async (key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const parts = key.split(":");
    const chainId = parts[0];
    const address = parts[1];
    const limit = parts[2] ? Number(parts[2]) : undefined;
    const offset = parts[3] ? Number(parts[3]) : undefined;
    return fetchAddressUtxos(chainId, address, { limit, offset }) as Promise<Record<string, unknown>>;
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

  app.get<{
    Params: { chain: string; address: string };
    Querystring: { maxPoints?: string; since?: string };
  }>("/v1/:chain/address/:address/balance-history", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const maxPoints = request.query.maxPoints ? Number(request.query.maxPoints) : undefined;
    const since = request.query.since ? Number(request.query.since) : undefined;
    const key = `${chainId}:${request.params.address}:${maxPoints ?? ""}:${since ?? ""}`;
    return balanceHistoryCache.fetch(key);
  });

  app.get<{
    Params: { chain: string; address: string };
    Querystring: { limit?: string; offset?: string };
  }>("/v1/:chain/address/:address/utxos", async (request, reply) => {
    const chainId = parseChainId(request.params.chain);
    if (!chainId) {
      return reply.code(400).send({ error: "Invalid chain id" });
    }

    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const offset = request.query.offset ? Number(request.query.offset) : undefined;
    const key = `${chainId}:${request.params.address}:${limit ?? ""}:${offset ?? ""}`;
    return utxosCache.fetch(key);
  });
}
