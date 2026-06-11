'use client';

import { useEffect } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { ChainId } from '@/lib/chainDisplay';

/**
 * Interval + tip-stream refresh for entity-scoped live data.
 * Pauses when the tab is hidden or `enabled` is false.
 */
export function useLivePoll({
  chainId,
  enabled = true,
  intervalMs,
  onRefresh,
}: {
  chainId: ChainId;
  enabled?: boolean;
  intervalMs: number;
  onRefresh: () => void | Promise<void>;
}): void {
  const visible = usePageVisible();
  const { subscribe } = useTipStream(chainId);

  useEffect(() => {
    if (!visible || !enabled) {
      return;
    }

    void onRefresh();

    const unsub = subscribe(chainId, () => {
      void onRefresh();
    });

    const interval = window.setInterval(() => {
      void onRefresh();
    }, intervalMs);

    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, [chainId, enabled, intervalMs, onRefresh, subscribe, visible]);
}
