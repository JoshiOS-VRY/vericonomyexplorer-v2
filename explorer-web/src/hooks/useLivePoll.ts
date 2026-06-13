'use client';

import { useEffect, useRef } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { ChainId } from '@/lib/chainDisplay';

/** Minimum spacing between tip-triggered refreshes (interval polls are unaffected). */
export const TIP_LIVE_REFRESH_MIN_MS = 15_000;

/**
 * Interval + tip-stream refresh for entity-scoped live data.
 * Pauses when the tab is hidden or `enabled` is false.
 */
export function useLivePoll({
  chainId,
  enabled = true,
  intervalMs,
  onRefresh,
  tipRefreshMinMs = TIP_LIVE_REFRESH_MIN_MS,
}: {
  chainId: ChainId;
  enabled?: boolean;
  intervalMs: number;
  onRefresh: () => void | Promise<void>;
  tipRefreshMinMs?: number;
}): void {
  const visible = usePageVisible();
  const { subscribe } = useTipStream(chainId);
  const lastTipRefreshRef = useRef(0);

  useEffect(() => {
    if (!visible || !enabled) {
      return;
    }

    void onRefresh();

    const unsub = subscribe(chainId, () => {
      const now = Date.now();
      if (now - lastTipRefreshRef.current < tipRefreshMinMs) {
        return;
      }
      lastTipRefreshRef.current = now;
      void onRefresh();
    });

    const interval = window.setInterval(() => {
      void onRefresh();
    }, intervalMs);

    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, [chainId, enabled, intervalMs, onRefresh, subscribe, tipRefreshMinMs, visible]);
}
