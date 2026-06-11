import { clientApiFetch } from '@/lib/api/client';
import type { AddressBalanceHistoryPeriodId, ChainActivityHistoryResult } from '@/lib/api/types';

export const CHAIN_ACTIVITY_HISTORY_PERIODS: {
  id: AddressBalanceHistoryPeriodId;
  label: string;
  days: number | null;
  maxPoints: number;
}[] = [
  { id: '7d', label: '7D', days: 7, maxPoints: 80 },
  { id: '30d', label: '30D', days: 30, maxPoints: 100 },
  { id: '90d', label: '90D', days: 90, maxPoints: 100 },
  { id: '1y', label: '1Y', days: 365, maxPoints: 120 },
  { id: 'all', label: 'All', days: null, maxPoints: 120 },
];

export function getChainActivityHistorySince(
  periodId: AddressBalanceHistoryPeriodId
): number | undefined {
  const period = CHAIN_ACTIVITY_HISTORY_PERIODS.find((item) => item.id === periodId);
  if (!period?.days) {
    return undefined;
  }

  return Math.floor(Date.now() / 1000) - period.days * 86_400;
}

export function getChainActivityHistoryMaxPoints(periodId: AddressBalanceHistoryPeriodId): number {
  return CHAIN_ACTIVITY_HISTORY_PERIODS.find((item) => item.id === periodId)?.maxPoints ?? 120;
}

const activityHistoryClientCache = new Map<string, Promise<ChainActivityHistoryResult>>();

export async function fetchChainActivityHistoryClient(
  chainId: string,
  periodId: AddressBalanceHistoryPeriodId
): Promise<ChainActivityHistoryResult> {
  const search = new URLSearchParams();
  search.set('maxPoints', String(getChainActivityHistoryMaxPoints(periodId)));
  const since = getChainActivityHistorySince(periodId);
  if (since != null) {
    search.set('since', String(since));
  }

  const path = `/${chainId}/activity-history?${search.toString()}`;
  const cached = activityHistoryClientCache.get(path);
  if (cached) {
    return cached;
  }

  const promise = clientApiFetch<ChainActivityHistoryResult>(path).finally(() => {
    window.setTimeout(() => {
      activityHistoryClientCache.delete(path);
    }, 300_000);
  });
  activityHistoryClientCache.set(path, promise);
  return promise;
}
