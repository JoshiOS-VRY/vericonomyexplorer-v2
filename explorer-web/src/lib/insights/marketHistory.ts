import { clientApiFetch } from '@/lib/api/client';
import type { AddressBalanceHistoryPeriodId, PriceHistoryPoint } from '@/lib/api/types';

export interface MarketHistoryResult {
  chainId: string;
  period: AddressBalanceHistoryPeriodId;
  currency: 'usd' | 'btc';
  since: number | null;
  points: PriceHistoryPoint[];
  source: 'livecoinwatch' | 'coingecko' | 'unavailable';
  fetchedAt: string;
}

export async function fetchMarketHistoryClient(
  chainId: string,
  periodId: AddressBalanceHistoryPeriodId,
  currency: 'usd' | 'btc' = 'usd'
): Promise<MarketHistoryResult> {
  const search = new URLSearchParams();
  search.set('period', periodId);
  search.set('currency', currency);

  return clientApiFetch<MarketHistoryResult>(
    `/${chainId}/insights/market-history?${search.toString()}`
  );
}
