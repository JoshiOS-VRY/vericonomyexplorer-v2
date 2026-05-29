import { runIndexerQuery } from "../db/queryPool.js";
export async function fetchNetworkMetricHistory(chainId, options = {}) {
    const chainHealth = options.chainHealth ??
        (await runIndexerQuery("getChainHealth", [chainId], {}));
    return runIndexerQuery("getNetworkMetricHistory", [chainId], {
        ...options,
        chainHealth,
    });
}
