import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { createRpcPool } from "./pool.js";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chainConfig = require(`${repoRoot}/app/indexerV2/chainConfig.js`);
const clients = new Map();
export function getRpcClient(chainId) {
    const existing = clients.get(chainId);
    if (existing)
        return existing;
    const chain = chainConfig.getChainConfig(chainId);
    const credentials = chainConfig.getRpcCredentials(chain);
    const client = createRpcPool(credentials);
    clients.set(chainId, client);
    return client;
}
export async function closeAllRpcClients() {
    await Promise.all([...clients.values()].map((client) => client.close()));
    clients.clear();
}
export function rpc(chainId) {
    return getRpcClient(chainId);
}
