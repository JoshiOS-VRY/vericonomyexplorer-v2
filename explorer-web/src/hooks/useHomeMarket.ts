'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHomeMarket } from '@/lib/api/client';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { HomeMarketPayload } from '@/lib/api/types';
import { MARKET_LIVE_POLL_MS } from '@/lib/liveDataConfig';

export function useHomeMarket(initial: HomeMarketPayload) {
  const visible = usePageVisible();
  const [market, setMarket] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!visible || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const next = await fetchHomeMarket();
      setMarket(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh market data');
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, MARKET_LIVE_POLL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [refresh, visible]);

  return {
    vrmMarket: market.vrm,
    vrcMarket: market.vrc,
    isRefreshing,
    error,
    refresh,
  };
}

export type { ChainMarket } from '@/lib/api/types';
