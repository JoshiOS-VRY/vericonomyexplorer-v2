import { runIndexerQuery, txLookupTimeoutMs } from "../db/queryPool.js";
import { getTip } from "../live/brokers.js";
import type { ChainId } from "../types.js";
import {
  enrichChainSummary,
  enrichLatestBlocksLive,
  enrichIndexerHealth,
  fetchBlockWithRpcFallback,
} from "./liveEnrichment.js";

const summaryQueryOptions = {
  skipBlockEnrichment: true,
};

export async function fetchChainSummary(
  chainId: string,
  options: Record<string, unknown> = {},
) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    "getChainSummaryIndexed",
    [chainId],
    queryOptions,
  )) as Record<string, unknown>;

  return enrichChainSummary(summary, chainId as ChainId, queryOptions);
}

export async function fetchChainSummaryLite(
  chainId: string,
  options: Record<string, unknown> = {},
) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    "getChainSummaryLiteIndexed",
    [chainId],
    queryOptions,
  )) as Record<string, unknown>;

  return enrichChainSummary(summary, chainId as ChainId, queryOptions);
}

export async function fetchLatestBlocks(
  chainId: string,
  options: Record<string, unknown> = {},
) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    "getLatestBlocksIndexed",
    [chainId],
    queryOptions,
  )) as Record<string, unknown>;

  return enrichLatestBlocksLive(
    indexed.latestBlocks,
    chainId as ChainId,
    indexed.health as Record<string, unknown>,
    queryOptions,
  );
}

export async function fetchLandingData() {
  const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
  const bundle = (await runIndexerQuery<{
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  }>("getLandingBundle", [], skipOpts)) as {
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  };

  const [vrmSummary, vrcSummary] = await Promise.all([
    enrichChainSummary(bundle.vrmSummary, "vrm", skipOpts),
    enrichChainSummary(bundle.vrcSummary, "vrc", skipOpts),
  ]);

  return {
    vrmSummary,
    vrcSummary,
    vrmRichlist: bundle.vrmRichlist,
    vrcRichlist: bundle.vrcRichlist,
    vrmLeaderboard: bundle.vrmLeaderboard,
  };
}

export async function fetchVrmDashboardIndexed() {
  return runIndexerQuery("getVrmDashboardBundle", [], {});
}

export async function fetchChainActivityHistory(
  chainId: string,
  options: { maxPoints?: number; since?: number; chainHealth?: Record<string, unknown> } = {},
) {
  return runIndexerQuery("getChainActivityHistory", [chainId], options);
}

export async function fetchIndexerHealth() {
  const baseHealth = await runIndexerQuery<Record<string, unknown>>(
    "getIndexerHealthIndexed",
    [],
    {},
  );
  return enrichIndexerHealth(baseHealth);
}

export function fetchRichlist(
  chainId: string,
  options: { limit?: number; offset?: number } = {},
) {
  return runIndexerQuery("getRichlist", [chainId], options);
}

export function fetchLeaderboard(
  chainId: string,
  options: {
    period?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  return runIndexerQuery("getLeaderboard", [chainId], options);
}

export function fetchAddressBalanceHistory(
  chainId: string,
  address: string,
  options: { maxPoints?: number; since?: number } = {},
) {
  return runIndexerQuery("getAddressBalanceHistory", [chainId, address], options);
}

export function fetchAddressUtxos(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number } = {},
) {
  return runIndexerQuery("getAddressUtxos", [chainId, address], options);
}

export function fetchTransaction(
  chainId: string,
  txid: string,
  queryOptions: { timeoutMs?: number; priority?: number } = {},
) {
  return runIndexerQuery("getTransaction", [chainId, txid], {}, {
    ...queryOptions,
    timeoutMs: queryOptions.timeoutMs ?? txLookupTimeoutMs,
    priority: queryOptions.priority ?? 0,
  });
}

export function fetchTransactionRelatedAddresses(
  chainId: string,
  txid: string,
  options: { limit?: number } = {},
) {
  return runIndexerQuery("getTransactionRelatedAddresses", [chainId, txid], options, {
    timeoutMs: txLookupTimeoutMs,
    priority: 0,
  });
}

export function fetchAddress(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number; includeRank?: boolean } = {},
  queryOptions: { timeoutMs?: number } = {},
) {
  return runIndexerQuery("getAddress", [chainId, address], options, queryOptions);
}

export async function fetchBlock(
  chainId: string,
  hashOrHeight: string,
  options: { limit?: number; offset?: number } = {},
) {
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    "getBlockIndexed",
    [chainId, hashOrHeight],
    options,
  )) as Record<string, unknown>;

  return fetchBlockWithRpcFallback(chainId as ChainId, hashOrHeight, indexed, options);
}

export function fetchChainHealth(chainId: string) {
  return runIndexerQuery("getChainHealth", [chainId], { fullHealth: true });
}

export function getCachedTip(chainId: ChainId) {
  const tip = getTip(chainId);
  return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
