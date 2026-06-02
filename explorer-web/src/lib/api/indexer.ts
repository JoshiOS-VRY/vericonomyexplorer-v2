import { v1Fetch, v1FetchText } from "@/lib/api/v1";
import { parseOrThrow, chainSummarySchema, indexerHealthSchema, richlistSchema, leaderboardSchema, minersSchema, transactionResultSchema, blockResultSchema } from "@/lib/api/schemas";
import type {
  AddressBalanceHistoryResult,
  AddressResult,
  AddressUtxosResult,
  BlockResult,
  ChainActivityHistoryResult,
  ChainSummary,
  HomeMarketPayload,
  HomeNetworkPayload,
  HomePayload,
  HomeShellPayload,
  IndexerHealth,
  LeaderboardResult,
  MinersLeaderboardResult,
  PeersResult,
  RichlistResult,
  TransactionRelatedAddressesResult,
  TransactionResult,
  VrmDashboardPayload,
} from "@/lib/api/types";

const SUMMARY_REVALIDATE_SECONDS = 30;
const BLOCK_TX_REVALIDATE_SECONDS = 60;
const LANDING_REVALIDATE_SECONDS = 60;

export async function getIndexerHealth(): Promise<IndexerHealth> {
  const data = await v1Fetch<IndexerHealth>("/indexer/status", { revalidate: SUMMARY_REVALIDATE_SECONDS });
  return parseOrThrow(indexerHealthSchema, data);
}

export async function getLandingData(): Promise<{
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  vrmRichlist: RichlistResult;
  vrcRichlist: RichlistResult;
  vrmLeaderboard: LeaderboardResult;
}> {
  const data = await v1Fetch<{
    vrmSummary: unknown;
    vrcSummary: unknown;
    vrmRichlist: unknown;
    vrcRichlist: unknown;
    vrmLeaderboard: unknown;
  }>("/landing", { revalidate: LANDING_REVALIDATE_SECONDS });

  return {
    vrmSummary: parseOrThrow(chainSummarySchema, data.vrmSummary) as unknown as ChainSummary,
    vrcSummary: parseOrThrow(chainSummarySchema, data.vrcSummary) as unknown as ChainSummary,
    vrmRichlist: parseOrThrow(richlistSchema, data.vrmRichlist) as unknown as RichlistResult,
    vrcRichlist: parseOrThrow(richlistSchema, data.vrcRichlist) as unknown as RichlistResult,
    vrmLeaderboard: parseOrThrow(leaderboardSchema, data.vrmLeaderboard) as unknown as LeaderboardResult,
  };
}

export async function getPeers(
  chainId: string,
  params: { limit?: number } = {},
): Promise<PeersResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return v1Fetch<PeersResult>(`/${chainId}/peers${qs ? `?${qs}` : ""}`, {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
  });
}

export async function getHomeShell(): Promise<HomeShellPayload> {
  return v1Fetch<HomeShellPayload>("/home/shell", { revalidate: SUMMARY_REVALIDATE_SECONDS });
}

export async function getHomeData(): Promise<HomePayload> {
  return v1Fetch<HomePayload>("/home", { revalidate: SUMMARY_REVALIDATE_SECONDS });
}

export async function getHomeMarket(): Promise<HomeMarketPayload> {
  return v1Fetch<HomeMarketPayload>("/home/market", { revalidate: 120 });
}

export async function getHomeNetwork(): Promise<HomeNetworkPayload> {
  return v1Fetch<HomeNetworkPayload>("/home/network", {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
    timeoutMs: Number(process.env.VCEXP_WEB_HOME_NETWORK_TIMEOUT_MS ?? 5_000),
  });
}

export async function getVrmDashboard(): Promise<VrmDashboardPayload> {
  const data = await v1Fetch<VrmDashboardPayload>("/vrm/dashboard", {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
    timeoutMs: 5_000,
  });

  return {
    summary: parseOrThrow(chainSummarySchema, data.summary) as unknown as ChainSummary,
    richlist: parseOrThrow(richlistSchema, data.richlist) as unknown as RichlistResult,
    leaderboard: parseOrThrow(leaderboardSchema, data.leaderboard) as unknown as LeaderboardResult,
    miners: parseOrThrow(minersSchema, data.miners) as unknown as MinersLeaderboardResult,
    network: data.network,
    market: data.market,
    fetchedAt: data.fetchedAt,
  };
}

export async function getChainActivityHistory(
  chainId: string,
  params: { maxPoints?: number; since?: number } = {},
): Promise<ChainActivityHistoryResult> {
  const search = new URLSearchParams();
  if (params.maxPoints != null) search.set("maxPoints", String(params.maxPoints));
  if (params.since != null) search.set("since", String(params.since));
  const qs = search.toString();
  return v1Fetch<ChainActivityHistoryResult>(
    `/${chainId}/activity-history${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
}

export async function getChainSummary(chainId: string): Promise<ChainSummary> {
  const data = await v1Fetch<unknown>(`/${chainId}/summary`, { revalidate: SUMMARY_REVALIDATE_SECONDS });
  return parseOrThrow(chainSummarySchema, data) as unknown as ChainSummary;
}

export async function getRichlist(
  chainId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<RichlistResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const data = await v1Fetch<unknown>(`/${chainId}/richlist${qs ? `?${qs}` : ""}`, {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
  });
  return parseOrThrow(richlistSchema, data) as unknown as RichlistResult;
}

export async function getLeaderboard(
  chainId: string,
  params: {
    period?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<LeaderboardResult> {
  const search = new URLSearchParams();
  if (params.period) search.set("period", params.period);
  if (params.sort) search.set("sort", params.sort);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const data = await v1Fetch<unknown>(`/${chainId}/leaderboard${qs ? `?${qs}` : ""}`, {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
    timeoutMs: 5_000,
  });
  return parseOrThrow(leaderboardSchema, data) as unknown as LeaderboardResult;
}

export async function getMinersLeaderboard(
  chainId: string,
  params: {
    period?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<MinersLeaderboardResult> {
  const search = new URLSearchParams();
  if (params.period) search.set("period", params.period);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const data = await v1Fetch<unknown>(`/${chainId}/miners${qs ? `?${qs}` : ""}`, {
    revalidate: SUMMARY_REVALIDATE_SECONDS,
    timeoutMs: 5_000,
  });
  return parseOrThrow(minersSchema, data) as unknown as MinersLeaderboardResult;
}

export async function getAddress(
  chainId: string,
  address: string,
  params: { limit?: number; offset?: number; includeRank?: boolean } = {},
): Promise<AddressResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  if (params.includeRank != null) {
    search.set("includeRank", params.includeRank ? "1" : "0");
  }
  const qs = search.toString();
  return v1Fetch<AddressResult>(
    `/${chainId}/address/${encodeURIComponent(address)}${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
}

export async function getAddressBalanceHistory(
  chainId: string,
  address: string,
  params: { maxPoints?: number; since?: number } = {},
): Promise<AddressBalanceHistoryResult> {
  const search = new URLSearchParams();
  if (params.maxPoints != null) search.set("maxPoints", String(params.maxPoints));
  if (params.since != null) search.set("since", String(params.since));
  const qs = search.toString();
  return v1Fetch<AddressBalanceHistoryResult>(
    `/${chainId}/address/${encodeURIComponent(address)}/balance-history${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
}

export async function getAddressUtxos(
  chainId: string,
  address: string,
  params: { limit?: number; offset?: number } = {},
): Promise<AddressUtxosResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  return v1Fetch<AddressUtxosResult>(
    `/${chainId}/address/${encodeURIComponent(address)}/utxos${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
}

export async function getTransaction(
  chainId: string,
  txid: string,
): Promise<TransactionResult> {
  const data = await v1Fetch<unknown>(`/${chainId}/tx/${encodeURIComponent(txid)}`, {
    revalidate: BLOCK_TX_REVALIDATE_SECONDS,
  });
  return parseOrThrow(transactionResultSchema, data) as unknown as TransactionResult;
}

export async function getTransactionRelatedAddresses(
  chainId: string,
  txid: string,
  params: { limit?: number } = {},
): Promise<TransactionRelatedAddressesResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return v1Fetch<TransactionRelatedAddressesResult>(
    `/${chainId}/tx/${encodeURIComponent(txid)}/related-addresses${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
}

export async function getBlock(
  chainId: string,
  hashOrHeight: string,
  params: { limit?: number; offset?: number } = {},
): Promise<BlockResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const data = await v1Fetch<unknown>(
    `/${chainId}/block/${encodeURIComponent(hashOrHeight)}${qs ? `?${qs}` : ""}`,
    { revalidate: SUMMARY_REVALIDATE_SECONDS },
  );
  return parseOrThrow(blockResultSchema, data) as unknown as BlockResult;
}

export async function getTipHeight(chainId: string): Promise<number> {
  const height = Number((await v1FetchText(`/${chainId}/tip/height`)).trim());
  if (!Number.isFinite(height)) {
    throw new Error("Invalid tip height response");
  }
  return height;
}

import { sanitizeSearchQuery } from "@/lib/searchSuggestions";

export async function searchChain(chainId: string, query: string): Promise<string | null> {
  const trimmed = sanitizeSearchQuery(query);
  if (!trimmed) return null;

  const result = await v1Fetch<{ path: string | null }>(
    `/${chainId}/search?q=${encodeURIComponent(trimmed)}`,
  );
  return result.path;
}

export async function searchVrm(query: string): Promise<string | null> {
  return searchChain("vrm", query);
}
