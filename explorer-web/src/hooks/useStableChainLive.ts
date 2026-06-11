'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { useLiveChainSummary } from '@/hooks/useLiveChainSummary';
import { chainLiveStore } from '@/lib/chainLive/store';
import type { ChainSummary } from '@/lib/api/types';
import { getChainTipHeight } from '@/lib/chainDisplay';

/** Live chain data that matches SSR until the client has hydrated (avoids hydration crashes). */
export function useStableChainLive(chainId: 'vrm' | 'vrc', initialSummary: ChainSummary) {
  const hydrated = useHydrated();
  const live = useLiveChainSummary(chainId, initialSummary);

  useLayoutEffect(() => {
    chainLiveStore.seedPageSummary(chainId, initialSummary);
  }, [chainId, initialSummary]);

  const stable = useMemo(
    () => ({
      summary: initialSummary,
      chainHeight: getChainTipHeight(initialSummary.health),
      addressCount: initialSummary.health.counts.addressCount,
      latestBlocks: initialSummary.latestBlocks,
      heightPulse: false,
      isRefreshing: false,
      error: null as string | null,
      lastUpdated: 0,
    }),
    [initialSummary]
  );

  return hydrated ? live : stable;
}
