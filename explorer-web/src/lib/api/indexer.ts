import { v1Fetch, v1FetchText } from "@/lib/api/v1";
import { parseOrThrow, chainSummarySchema, indexerHealthSchema, richlistSchema, leaderboardSchema } from "@/lib/api/schemas";
import type {
  AddressResult,
  BlockResult,
  ChainSummary,
  IndexerHealth,
  LeaderboardResult,
  RichlistResult,
  TransactionResult,
} from "@/lib/api/types";

const REVALIDATE_SECONDS = 30;

export async function getIndexerHealth(): Promise<IndexerHealth> {
  const data = await v1Fetch<IndexerHealth>("/indexer/status", { revalidate: REVALIDATE_SECONDS });
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
  }>("/landing", { revalidate: 60 });

  return {
    vrmSummary: parseOrThrow(chainSummarySchema, data.vrmSummary) as unknown as ChainSummary,
    vrcSummary: parseOrThrow(chainSummarySchema, data.vrcSummary) as unknown as ChainSummary,
    vrmRichlist: parseOrThrow(richlistSchema, data.vrmRichlist) as unknown as RichlistResult,
    vrcRichlist: parseOrThrow(richlistSchema, data.vrcRichlist) as unknown as RichlistResult,
    vrmLeaderboard: parseOrThrow(leaderboardSchema, data.vrmLeaderboard) as unknown as LeaderboardResult,
  };
}

export async function getVrmDashboard(): Promise<{
  summary: ChainSummary;
  richlist: RichlistResult;
  leaderboard: LeaderboardResult;
}> {
  const data = await v1Fetch<{
    summary: unknown;
    richlist: unknown;
    leaderboard: unknown;
  }>("/vrm/dashboard", { revalidate: REVALIDATE_SECONDS });

  return {
    summary: parseOrThrow(chainSummarySchema, data.summary) as unknown as ChainSummary,
    richlist: parseOrThrow(richlistSchema, data.richlist) as unknown as RichlistResult,
    leaderboard: parseOrThrow(leaderboardSchema, data.leaderboard) as unknown as LeaderboardResult,
  };
}

export async function getChainSummary(chainId: string): Promise<ChainSummary> {
  const data = await v1Fetch<unknown>(`/${chainId}/summary`, { revalidate: REVALIDATE_SECONDS });
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
    revalidate: REVALIDATE_SECONDS,
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
    revalidate: REVALIDATE_SECONDS,
  });
  return parseOrThrow(leaderboardSchema, data) as unknown as LeaderboardResult;
}

export async function getAddress(
  chainId: string,
  address: string,
  params: { limit?: number; offset?: number } = {},
): Promise<AddressResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  return v1Fetch<AddressResult>(
    `/${chainId}/address/${encodeURIComponent(address)}${qs ? `?${qs}` : ""}`,
    { revalidate: REVALIDATE_SECONDS },
  );
}

export async function getTransaction(
  chainId: string,
  txid: string,
): Promise<TransactionResult> {
  return v1Fetch<TransactionResult>(`/${chainId}/tx/${encodeURIComponent(txid)}`, {
    revalidate: REVALIDATE_SECONDS,
  });
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
  return v1Fetch<BlockResult>(
    `/${chainId}/block/${encodeURIComponent(hashOrHeight)}${qs ? `?${qs}` : ""}`,
    { revalidate: REVALIDATE_SECONDS },
  );
}

export async function getTipHeight(chainId: string): Promise<number> {
  const height = Number((await v1FetchText(`/${chainId}/tip/height`)).trim());
  if (!Number.isFinite(height)) {
    throw new Error("Invalid tip height response");
  }
  return height;
}

export async function searchChain(chainId: string, query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const result = await v1Fetch<{ path: string | null }>(
    `/${chainId}/search?q=${encodeURIComponent(trimmed)}`,
  );
  return result.path;
}

export async function searchVrm(query: string): Promise<string | null> {
  return searchChain("vrm", query);
}
