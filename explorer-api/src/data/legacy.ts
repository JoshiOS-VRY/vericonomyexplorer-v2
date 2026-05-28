import { runIndexerQuery } from "../db/queryPool.js";
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

export async function fetchLatestBlocks(
  chainId: string,
  options: Record<string, unknown> = {},
) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    "getChainSummaryIndexed",
    [chainId],
    queryOptions,
  )) as Record<string, unknown>;

  return enrichLatestBlocksLive(
    summary.latestBlocks,
    chainId as ChainId,
    summary.health as Record<string, unknown>,
    queryOptions,
  );
}

export async function fetchLandingData() {
  const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };

  // Run indexed reads in parallel (one worker each) instead of one serial getLandingBundle call.
  const [vrmSummaryRaw, vrcSummaryRaw, vrmRichlist, vrcRichlist, vrmLeaderboard] =
    await Promise.all([
      runIndexerQuery<Record<string, unknown>>("getChainSummaryIndexed", ["vrm"], skipOpts),
      runIndexerQuery<Record<string, unknown>>("getChainSummaryIndexed", ["vrc"], skipOpts),
      runIndexerQuery<Record<string, unknown>>("getRichlist", ["vrm"], { limit: 5 }),
      runIndexerQuery<Record<string, unknown>>("getRichlist", ["vrc"], { limit: 5 }),
      runIndexerQuery<Record<string, unknown>>("getLeaderboard", ["vrm"], {
        period: "month",
        sort: "activity",
        limit: 5,
      }),
    ]);

  const [vrmSummary, vrcSummary] = await Promise.all([
    enrichChainSummary(vrmSummaryRaw, "vrm", skipOpts),
    enrichChainSummary(vrcSummaryRaw, "vrc", skipOpts),
  ]);

  return {
    vrmSummary,
    vrcSummary,
    vrmRichlist,
    vrcRichlist,
    vrmLeaderboard,
  };
}

export async function fetchVrmDashboardIndexed() {
  return runIndexerQuery("getVrmDashboardBundle", [], {});
}

export function fetchChainActivityHistory(
  chainId: string,
  options: { maxPoints?: number; since?: number } = {},
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
  queryOptions: { timeoutMs?: number } = {},
) {
  return runIndexerQuery("getTransaction", [chainId, txid], {}, queryOptions);
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
