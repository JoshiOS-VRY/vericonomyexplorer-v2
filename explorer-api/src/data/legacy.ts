import { runIndexerQuery, txLookupTimeoutMs } from '../db/queryPool.js';
import { getTip } from '../live/brokers.js';
import type { ChainId } from '../types.js';
import {
  enrichChainSummary,
  enrichLatestBlocksLive,
  enrichIndexerHealth,
  fetchBlockWithRpcFallback,
  fetchTransactionWithRpcFallback,
  fetchAddressWithRpcFallback,
} from './liveEnrichment.js';

const summaryQueryOptions = {
  skipBlockEnrichment: true,
};

/** Indexed-first enrichment; live RPC/block merge is handled by tip refresh + client polling. */
const defaultSummaryEnrichOptions = {
  skipLiveBlocks: true,
  skipLiveRpc: true,
};

export async function fetchChainSummary(chainId: string, options: Record<string, unknown> = {}) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const enrichOptions = { ...defaultSummaryEnrichOptions, ...options };
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    'getChainSummaryIndexed',
    [chainId],
    queryOptions
  )) as Record<string, unknown>;

  return enrichChainSummary(summary, chainId as ChainId, enrichOptions);
}

export async function fetchChainSummaryLite(
  chainId: string,
  options: Record<string, unknown> = {}
) {
  const queryOptions = { ...summaryQueryOptions, ...options };
  const enrichOptions = { ...defaultSummaryEnrichOptions, ...options };
  const summary = (await runIndexerQuery<Record<string, unknown>>(
    'getChainSummaryLiteIndexed',
    [chainId],
    queryOptions
  )) as Record<string, unknown>;

  return enrichChainSummary(summary, chainId as ChainId, enrichOptions);
}

export async function fetchLatestBlocks(chainId: string, options: Record<string, unknown> = {}) {
  const queryOptions: Record<string, unknown> = { ...summaryQueryOptions, ...options };
  if (options.limit != null) {
    queryOptions.limit = options.limit;
  }
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    'getLatestBlocksIndexed',
    [chainId],
    queryOptions
  )) as Record<string, unknown>;

  return enrichLatestBlocksLive(
    indexed.latestBlocks,
    chainId as ChainId,
    indexed.health as Record<string, unknown>,
    queryOptions
  );
}

export async function fetchBlocksPage(chainId: string, options: Record<string, unknown> = {}) {
  const queryOptions = { skipBlockEnrichment: false, ...options };
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    'getBlocksPageIndexed',
    [chainId],
    queryOptions
  )) as Record<string, unknown>;

  const items = await enrichLatestBlocksLive(
    indexed.items,
    chainId as ChainId,
    indexed.health as Record<string, unknown>,
    { ...queryOptions, skipLiveBlocks: true }
  );

  return {
    ...indexed,
    items,
  };
}

export async function fetchLandingData() {
  const skipOpts = { skipLiveBlocks: true, skipLiveRpc: true };
  const bundle = (await runIndexerQuery<{
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  }>('getLandingBundle', [], skipOpts)) as {
    vrmSummary: Record<string, unknown>;
    vrcSummary: Record<string, unknown>;
    vrmRichlist: Record<string, unknown>;
    vrcRichlist: Record<string, unknown>;
    vrmLeaderboard: Record<string, unknown>;
  };

  const [vrmSummary, vrcSummary] = await Promise.all([
    enrichChainSummary(bundle.vrmSummary, 'vrm', skipOpts),
    enrichChainSummary(bundle.vrcSummary, 'vrc', skipOpts),
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
  return runIndexerQuery('getVrmDashboardBundle', [], {});
}

export async function fetchChainActivityHistory(
  chainId: string,
  options: { maxPoints?: number; since?: number; chainHealth?: Record<string, unknown> } = {}
) {
  return runIndexerQuery('getChainActivityHistory', [chainId], options);
}

export async function fetchIndexerHealth() {
  const baseHealth = await runIndexerQuery<Record<string, unknown>>(
    'getIndexerHealthIndexed',
    [],
    {}
  );
  return enrichIndexerHealth(baseHealth);
}

export function fetchRichlist(chainId: string, options: { limit?: number; offset?: number } = {}) {
  return runIndexerQuery('getRichlist', [chainId], options);
}

export function fetchLeaderboard(
  chainId: string,
  options: {
    period?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  return runIndexerQuery('getLeaderboard', [chainId], options, {
    timeoutMs: Number(process.env.VCEXP_API_LEADERBOARD_TIMEOUT_MS ?? 5_000),
    priority: 1,
  });
}

export function fetchMinedLeaderboard(
  chainId: string,
  options: {
    period?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  return runIndexerQuery('getMinedLeaderboard', [chainId], options, {
    timeoutMs: Number(process.env.VCEXP_API_MINERS_TIMEOUT_MS ?? 5_000),
    priority: 1,
  });
}

export function fetchMinerShareTrend(
  chainId: string,
  options: { period?: string; top?: number; maxPoints?: number } = {}
) {
  return runIndexerQuery('getMinerShareTrend', [chainId], options, {
    timeoutMs: Number(process.env.VCEXP_API_MINERS_TIMEOUT_MS ?? 5_000),
    priority: 1,
  });
}

export function fetchMinerBlockDistribution(
  chainId: string,
  options: { blocks?: number; top?: number } = {}
) {
  return runIndexerQuery('getMinerBlockDistribution', [chainId], options, {
    timeoutMs: Number(process.env.VCEXP_API_MINERS_TIMEOUT_MS ?? 5_000),
    priority: 1,
  });
}

export function fetchAddressBalanceHistory(
  chainId: string,
  address: string,
  options: { maxPoints?: number; since?: number } = {}
) {
  return runIndexerQuery('getAddressBalanceHistory', [chainId, address], options);
}

export function fetchAddressUtxos(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number } = {}
) {
  return runIndexerQuery('getAddressUtxos', [chainId, address], options);
}

export async function fetchTransaction(
  chainId: string,
  txid: string,
  queryOptions: { timeoutMs?: number; priority?: number } = {}
) {
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    'getTransaction',
    [chainId, txid],
    {},
    {
      ...queryOptions,
      timeoutMs: queryOptions.timeoutMs ?? txLookupTimeoutMs,
      priority: queryOptions.priority ?? 0,
    }
  )) as Record<string, unknown>;

  return fetchTransactionWithRpcFallback(chainId as ChainId, txid, indexed, queryOptions);
}

export function fetchTransactionRelatedAddresses(
  chainId: string,
  txid: string,
  options: { limit?: number } = {}
) {
  return runIndexerQuery('getTransactionRelatedAddresses', [chainId, txid], options, {
    timeoutMs: txLookupTimeoutMs,
    priority: 0,
  });
}

export async function fetchAddress(
  chainId: string,
  address: string,
  options: { limit?: number; offset?: number; includeRank?: boolean } = {},
  queryOptions: { timeoutMs?: number } = {}
) {
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    'getAddress',
    [chainId, address],
    options,
    queryOptions
  )) as Record<string, unknown>;

  return fetchAddressWithRpcFallback(chainId as ChainId, address, indexed, {
    ...options,
    ...queryOptions,
  });
}

export async function fetchBlock(
  chainId: string,
  hashOrHeight: string,
  options: { limit?: number; offset?: number } = {}
) {
  const queryOptions = {
    skipAddressCount: true,
    skipBlockEnrichment: true,
    skipHeavyTotals: true,
    ...options,
  };
  const indexed = (await runIndexerQuery<Record<string, unknown>>(
    'getBlockIndexed',
    [chainId, hashOrHeight],
    queryOptions,
    { priority: 0 }
  )) as Record<string, unknown>;

  return fetchBlockWithRpcFallback(chainId as ChainId, hashOrHeight, indexed, queryOptions);
}

export function fetchChainHealth(chainId: string) {
  return runIndexerQuery('getChainHealth', [chainId], { fullHealth: true });
}

export function getCachedTip(chainId: ChainId) {
  const tip = getTip(chainId);
  return tip ? { height: tip.height, hash: tip.hash } : undefined;
}
