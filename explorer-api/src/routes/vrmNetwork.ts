import type { FastifyInstance } from "fastify";
import { createSwrCache, swrFetch } from "../cache/swrCache.js";
import { registerGlobalCache } from "../cache/registry.js";
import { registerGlobalTipRefresh } from "../cache/tipRefresh.js";
import { refreshCacheInBackground } from "../cache/swrCache.js";
import { rpc } from "../rpc/index.js";
import { fetchCanonicalVrmHashrate } from "../network/hashrateLive.js";
import type { VrmNetworkHashratePayload } from "../types/home.js";
import { parseRpcNumber, type RpcCall } from "../network/stats.js";
import { NETWORK_HASHRATE_POLL_MS } from "@vericonomy/network-metrics";

const HOT_RPC_TIMEOUT_MS = Number(process.env.VCEXP_HOT_RPC_TIMEOUT_MS ?? 4_000);

function rpcCall(): RpcCall {
  const client = rpc("vrm");
  return (method, params = [], timeoutMs = HOT_RPC_TIMEOUT_MS) =>
    client.call(method, params, timeoutMs);
}

async function fetchVrmNetworkHashratePayload(): Promise<VrmNetworkHashratePayload> {
  const call = rpcCall();
  const resolved = await fetchCanonicalVrmHashrate(call, { include7d: true });

  let difficulty: number | null = null;
  try {
    const blockchain = (await call("getblockchaininfo")) as { difficulty?: unknown };
    difficulty = parseRpcNumber(blockchain?.difficulty);
  } catch {
    /* optional */
  }

  return {
    hashPerSec: resolved.hashPerSec,
    hashrateKhPerMin: resolved.hashrateKhPerMin,
    source: resolved.source === "none" ? null : resolved.source,
    difficulty,
    fetchedAt: new Date().toISOString(),
  };
}

const vrmHashrateCache = createSwrCache({
  max: 2,
  ttlMs: NETWORK_HASHRATE_POLL_MS,
  fetch: async (_key, signal) => {
    if (signal.aborted) throw new Error("aborted");
    const data = await fetchVrmNetworkHashratePayload();
    return data as unknown as Record<string, unknown>;
  },
});

registerGlobalCache(vrmHashrateCache);
registerGlobalTipRefresh("vrm-hashrate", () =>
  refreshCacheInBackground(vrmHashrateCache, "vrm-hashrate"),
);

export async function registerVrmNetworkRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/vrm/network/hashrate", async () =>
    swrFetch(vrmHashrateCache, "vrm-hashrate", fetchVrmNetworkHashratePayload),
  );
}

export { vrmHashrateCache, fetchVrmNetworkHashratePayload };
