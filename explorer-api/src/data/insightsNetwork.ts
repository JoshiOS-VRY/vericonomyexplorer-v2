import { runIndexerQuery } from "../db/queryPool.js";

export async function fetchNetworkMetricHistory(
  chainId: string,
  options: {
    maxPoints?: number;
    since?: number;
    groupBy?: string;
    chainHealth?: Record<string, unknown>;
  } = {},
) {
  const chainHealth =
    options.chainHealth ??
    ((await runIndexerQuery<Record<string, unknown>>("getChainHealth", [chainId], {})) as Record<
      string,
      unknown
    >);

  return runIndexerQuery("getNetworkMetricHistory", [chainId], {
    ...options,
    chainHealth,
  });
}
