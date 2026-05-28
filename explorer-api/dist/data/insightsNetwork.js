import { runIndexerQuery } from "../db/queryPool.js";
export function fetchNetworkMetricHistory(chainId, options = {}) {
    return runIndexerQuery("getNetworkMetricHistory", [chainId], options);
}
