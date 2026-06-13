'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePageVisible } from '@/hooks/usePageVisible';
import {
  CHAIN_ACTIVITY_HISTORY_POLL_MS,
  fetchChainActivityHistoryClient,
  isSameChainActivityHistory,
} from '@/lib/chainActivityHistory';
import type { AddressBalanceHistoryPeriodId, ChainActivityHistoryResult } from '@/lib/api/types';

export function useChainActivityHistoryPoll({
  chainId,
  period,
  history,
  onHistory,
  onDefaultHistory,
  enabled = true,
}: {
  chainId: string;
  period: AddressBalanceHistoryPeriodId;
  history: ChainActivityHistoryResult | null;
  onHistory: (next: ChainActivityHistoryResult) => void;
  onDefaultHistory?: (next: ChainActivityHistoryResult) => void;
  enabled?: boolean;
}) {
  const visible = usePageVisible();
  const inFlightRef = useRef(false);
  const historyRef = useRef(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const refresh = useCallback(async () => {
    if (inFlightRef.current || !enabled) {
      return;
    }

    inFlightRef.current = true;

    try {
      const next = await fetchChainActivityHistoryClient(chainId, period);
      if (isSameChainActivityHistory(historyRef.current, next)) {
        return;
      }

      if (period === '30d') {
        onDefaultHistory?.(next);
      }
      onHistory(next);
    } catch {
      /* keep last good snapshot on poll failure */
    } finally {
      inFlightRef.current = false;
    }
  }, [chainId, enabled, onDefaultHistory, onHistory, period]);

  useEffect(() => {
    if (!visible || !enabled || !history) {
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, CHAIN_ACTIVITY_HISTORY_POLL_MS);

    return () => window.clearInterval(interval);
  }, [chainId, enabled, history, period, refresh, visible]);

  return { refresh };
}
