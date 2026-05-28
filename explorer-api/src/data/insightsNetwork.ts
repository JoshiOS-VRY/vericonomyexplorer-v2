import { runIndexerQuery } from "../db/queryPool.js";

export function fetchNetworkMetricHistory(
  chainId: string,
  options: { maxPoints?: number; since?: number; groupBy?: string } = {},
) {
  return runIndexerQuery("getNetworkMetricHistory", [chainId], options);
}
