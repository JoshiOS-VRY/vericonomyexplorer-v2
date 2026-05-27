import { runIndexerQuery } from "../db/queryPool.js";
import { getTip } from "../live/brokers.js";
import type { ChainId } from "../types.js";
import {
  enrichChainSummary,
  enrichIndexerHealth,
  fetchBlockWithRpcFallback,
} from "./liveEnrichment.js";

export async function fetchChainSummary(
  chainId: string,
  options: Record<string, unknown> = {},
) {
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    "getChainSummaryIndexed",
    [chainId],
    options,
  )) as Record<string, unknown>;

  return enrichChainSummary(summary, chainId as ChainId, options);
}

export async function fetchLandingData() {
  const bundle = (await runIndexerQuery<{
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  }>("getLandingBundle", [], {})) as {
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  };

  const [vrmSummary, vrcSummary] = await Promise.all([
    enrichChainSummary(bundle.vrmSummary, "vrm", { skipLiveBlocks: true }),
    enrichChainSummary(bundle.vrcSummary, "vrc", { skipLiveBlocks: true }),
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

export function fetchAddress(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number; includeRank?: boolean } = {},
) {
  return runIndexerQuery("getAddress", [chainId, address], options);
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

export function fetchTransaction(chainId: string, txid: string) {
  return runIndexerQuery(
    "getTransaction",
    [chainId, txid],
    {},
    { timeoutMs: 15_000 },
  );
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
  return runIndexerQuery("getChainHealth", [chainId], {});
}

export function getCachedTip(chainId: ChainId) {
  const tip = getTip(chainId);
  return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
