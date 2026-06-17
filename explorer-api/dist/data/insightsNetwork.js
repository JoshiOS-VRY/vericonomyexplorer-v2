import { runIndexerQuery } from '../db/queryPool.js';
export async function fetchNetworkMetricHistory(chainId, options = {}) {
    return runIndexerQuery('getNetworkMetricHistory', [chainId], options);
}
