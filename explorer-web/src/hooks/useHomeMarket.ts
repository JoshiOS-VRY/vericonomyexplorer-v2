"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHomeMarket } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ChainMarket, HomeMarketPayload } from "@/lib/api/types";

const MARKET_POLL_MS = 60_000;

export function useHomeMarket(initial: HomeMarketPayload) {
  const visible = usePageVisible();
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
      setError(err instanceof Error ? err.message : "Failed to refresh market data");
    } finally {
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
    }, MARKET_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, visible]);

  return {
    vrmMarket: market.vrm,
    vrcMarket: market.vrc,
    isRefreshing,
    error,
    refresh,
  };
}

export type { ChainMarket };
