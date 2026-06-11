'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePageVisible } from '@/hooks/usePageVisible';
import {
  ADDRESS_BALANCE_HISTORY_POLL_MS,
  fetchAddressBalanceHistoryClient,
  isSameAddressBalanceHistory,
} from '@/lib/addressBalanceHistory';
import type { AddressBalanceHistoryPeriodId, AddressBalanceHistoryResult } from '@/lib/api/types';

export function useAddressBalanceHistoryPoll({
  chainId,
  address,
  period,
  history,
  onHistory,
  onAllHistory,
  enabled = true,
}: {
  chainId: string;
  address: string;
  period: AddressBalanceHistoryPeriodId;
  history: AddressBalanceHistoryResult | null;
  onHistory: (next: AddressBalanceHistoryResult) => void;
  onAllHistory?: (next: AddressBalanceHistoryResult) => void;
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
      const next = await fetchAddressBalanceHistoryClient(chainId, address, period);
      if (isSameAddressBalanceHistory(historyRef.current, next)) {
        return;
      }

      if (period === 'all') {
        onAllHistory?.(next);
      }
      onHistory(next);
    } catch {
      /* keep last good snapshot on poll failure */
    } finally {
      inFlightRef.current = false;
    }
  }, [address, chainId, enabled, onAllHistory, onHistory, period]);

  useEffect(() => {
    if (!visible || !enabled || !history) {
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, ADDRESS_BALANCE_HISTORY_POLL_MS);

    return () => window.clearInterval(interval);
  }, [address, chainId, enabled, history, period, refresh, visible]);

  return { refresh };
}
