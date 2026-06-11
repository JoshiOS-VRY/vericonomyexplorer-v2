import { runIndexerQuery } from '../db/queryPool.js';

export async function fetchNetworkMetricHistory(
  chainId: string,
  options: {
    maxPoints?: number;
    since?: number;
    groupBy?: string;
    chainHealth?: Record<string, unknown>;
  } = {}
) {
  return runIndexerQuery('getNetworkMetricHistory', [chainId], options);
}
