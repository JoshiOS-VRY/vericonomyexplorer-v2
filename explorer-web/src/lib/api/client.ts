import type {
  AddressUtxosResult,
  BlockResult,
  BlocksPageResult,
  ChainSummary,
  HomeMarketPayload,
  HomeNetworkPayload,
  IndexedBlock,
  MinerBlockDistributionResult,
  MinersLeaderboardResult,
  MinerShareTrendResult,
  RichlistResult,
  TransactionResult,
} from '@/lib/api/types';
import { getClientV1Url, getTipStreamUrl } from '@/lib/api/v1Urls';

export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
  }
}

export function getClientApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return getClientV1Url(normalized);
}

const inFlightClientRequests = new Map<string, Promise<unknown>>();

export async function clientApiFetch<T>(path: string): Promise<T> {
  const url = getClientV1Url(path);
  const existing = inFlightClientRequests.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        /* ignore */
      }
      throw new ClientApiError(message, response.status);
    }

    return response.json() as Promise<T>;
  })().finally(() => {
    inFlightClientRequests.delete(url);
  });

  inFlightClientRequests.set(url, promise);
  return promise as Promise<T>;
}

export async function fetchAddressUtxosClient(
  chainId: string,
  address: string,
  params: { limit?: number; offset?: number } = {}
): Promise<AddressUtxosResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();

  return clientApiFetch<AddressUtxosResult>(
    `/${chainId}/address/${encodeURIComponent(address)}/utxos${qs ? `?${qs}` : ''}`
  );
}

export async function fetchBlockClient(
  chainId: string,
  hashOrHeight: string,
  params: { limit?: number; offset?: number } = {}
): Promise<BlockResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();

  return clientApiFetch<BlockResult>(
    `/${chainId}/block/${encodeURIComponent(hashOrHeight)}${qs ? `?${qs}` : ''}`
  );
}

export async function fetchTransactionClient(
  chainId: string,
  txid: string
): Promise<TransactionResult> {
  return clientApiFetch<TransactionResult>(`/${chainId}/tx/${encodeURIComponent(txid)}`);
}

export async function fetchRichlistClient(
  chainId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<RichlistResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();

  return clientApiFetch<RichlistResult>(`/${chainId}/richlist${qs ? `?${qs}` : ''}`);
}

export async function fetchBlockHeight(chainId = 'vrm'): Promise<number> {
  const response = await fetch(getClientV1Url(`/${chainId}/tip/height`), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ClientApiError(`Request failed: ${response.status}`, response.status);
  }

  const height = Number((await response.text()).trim());
  if (!Number.isFinite(height)) {
    throw new ClientApiError('Invalid block height response', response.status);
  }

  return height;
}

export async function fetchChainSummary(chainId: string): Promise<ChainSummary> {
  return clientApiFetch<ChainSummary>(`/${chainId}/summary/lite`);
}

export async function fetchLatestBlocks(
  chainId: string,
  params: { limit?: number } = {}
): Promise<IndexedBlock[]> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  const qs = search.toString();
  return clientApiFetch<IndexedBlock[]>(`/${chainId}/blocks/latest${qs ? `?${qs}` : ''}`);
}

export async function fetchBlocksPageClient(
  chainId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<BlocksPageResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();

  return clientApiFetch<BlocksPageResult>(`/${chainId}/blocks${qs ? `?${qs}` : ''}`);
}

export async function fetchHomeMarket(): Promise<HomeMarketPayload> {
  return clientApiFetch<HomeMarketPayload>('/home/market');
}

export async function fetchHomeNetwork(): Promise<HomeNetworkPayload> {
  return clientApiFetch<HomeNetworkPayload>('/home/network');
}

export async function fetchMinersLeaderboardClient(
  chainId: string,
  params: { period?: string; limit?: number; offset?: number } = {}
): Promise<MinersLeaderboardResult> {
  const search = new URLSearchParams();
  if (params.period) search.set('period', params.period);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();

  return clientApiFetch<MinersLeaderboardResult>(`/${chainId}/miners${qs ? `?${qs}` : ''}`);
}

export async function fetchMinerShareTrendClient(
  chainId: string,
  params: { period?: string; top?: number } = {}
): Promise<MinerShareTrendResult> {
  const search = new URLSearchParams();
  if (params.period) search.set('period', params.period);
  if (params.top != null) search.set('top', String(params.top));
  const qs = search.toString();
  return clientApiFetch<MinerShareTrendResult>(
    `/${chainId}/miners/share-trend${qs ? `?${qs}` : ''}`
  );
}

export async function fetchMinerBlockDistributionClient(
  chainId: string,
  params: { blocks?: number; top?: number } = {}
): Promise<MinerBlockDistributionResult> {
  const search = new URLSearchParams();
  if (params.blocks != null) search.set('blocks', String(params.blocks));
  if (params.top != null) search.set('top', String(params.top));
  const qs = search.toString();
  return clientApiFetch<MinerBlockDistributionResult>(
    `/${chainId}/miners/distribution${qs ? `?${qs}` : ''}`
  );
}

import { sanitizeSearchQuery } from '@/lib/searchSuggestions';

export async function searchChainClient(chainId: string, query: string): Promise<string | null> {
  const trimmed = sanitizeSearchQuery(query);
  if (!trimmed) return null;

  const result = await clientApiFetch<{ path: string | null }>(
    `/${chainId}/search?q=${encodeURIComponent(trimmed)}`
  );
  return result.path;
}

async function browserJsonFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ClientApiError(`Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchLegacyBlockTip(): Promise<{ height: number; hash: string }> {
  return browserJsonFetch('/api/proxy/blocks/tip');
}

export async function fetchLegacyBlocksByHeight<T>(heights: number[]): Promise<T> {
  return browserJsonFetch(`/api/internal/blocks-by-height/${heights.join(',')}`);
}

export { getTipStreamUrl };
