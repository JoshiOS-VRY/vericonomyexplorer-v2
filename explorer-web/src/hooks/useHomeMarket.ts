'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { fetchHomeMarket } from '@/lib/api/client';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { HomeMarketPayload } from '@/lib/api/types';
import { MARKET_LIVE_POLL_MS } from '@/lib/liveDataConfig';

export function useHomeMarket(initial: HomeMarketPayload) {
  const visible = usePageVisible();
  const { subscribe } = useTipStream('vrm');
  const [market, setMarket] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!visible) {
      return;
    }

    setIsRefreshing(true);
    try {
      const next = await fetchHomeMarket();
      setMarket(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh market data');
    } finally {
      setIsRefreshing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void refresh();

    const unsubVrm = subscribe('vrm', () => {
      void refresh();
    });
    const unsubVrc = subscribe('vrc', () => {
      void refresh();
    });

    const timer = window.setInterval(() => {
      void refresh();
    }, MARKET_LIVE_POLL_MS);

    return () => {
      unsubVrm();
      unsubVrc();
      window.clearInterval(timer);
    };
  }, [refresh, subscribe, visible]);

  return {
    vrmMarket: market.vrm,
    vrcMarket: market.vrc,
    isRefreshing,
    error,
    refresh,
  };
}

export type { ChainMarket } from '@/lib/api/types';
