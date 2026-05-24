import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import type { ChainId } from "../types.js";
import { createRpcPool, type RpcClient } from "./pool.js";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chainConfig = require(`${repoRoot}/app/indexerV2/chainConfig.js`) as {
  getChainConfig: (chainId: string) => unknown;
  getRpcCredentials: (chain: unknown) => {
    host: string;
    port: number;
    username?: string;
    password?: string;
    timeout?: number;
  };
};

const clients = new Map<ChainId, RpcClient>();

export function getRpcClient(chainId: ChainId): RpcClient {
  const existing = clients.get(chainId);
  if (existing) return existing;

  const chain = chainConfig.getChainConfig(chainId);
  const credentials = chainConfig.getRpcCredentials(chain);
  const client = createRpcPool(credentials);
  clients.set(chainId, client);
  return client;
}

export async function closeAllRpcClients(): Promise<void> {
  await Promise.all([...clients.values()].map((client) => client.close()));
  clients.clear();
}

export function rpc(chainId: ChainId): RpcClient {
  return getRpcClient(chainId);
}
