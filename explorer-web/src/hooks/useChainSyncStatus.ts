'use client';

import { useMemo } from 'react';
import { useChainTipState } from '@/components/explorer/TipStreamProvider';
import { useHydrated } from '@/hooks/useHydrated';
import { useChainLiveSnapshot } from '@/lib/chainLive/useChainLiveSnapshot';
import { snapshotFromSummary } from '@/lib/chainLive/store';
import type { ChainSummary } from '@/lib/api/types';
import { getChainSyncLabel, getChainTipHeight, isChainAtTip } from '@/lib/chainDisplay';

export function useChainSyncStatus(chainId: 'vrm' | 'vrc', initialSummary?: ChainSummary | null) {
  const hydrated = useHydrated();
  const liveSnapshot = useChainLiveSnapshot(chainId, initialSummary);
  const stableSnapshot = useMemo(
    () => snapshotFromSummary(chainId, initialSummary),
    [chainId, initialSummary]
  );
  const snapshot = hydrated ? liveSnapshot : stableSnapshot;
  const { height: streamTipHeight } = useChainTipState(chainId);
  const health = snapshot.summary.health;
  const latestBlockHeight = snapshot.latestBlocks[0]?.height ?? null;
  const loading = initialSummary == null && !snapshot.summary.health.checks.hasBlocks;

  const liveTipHeight = streamTipHeight ?? health.heights.bestRpcHeight ?? null;
  const live = isChainAtTip(health, latestBlockHeight, liveTipHeight);
  const height = liveTipHeight ?? getChainTipHeight(health);
  const label = loading ? null : getChainSyncLabel(health, latestBlockHeight, liveTipHeight);

  return { live, height, label, loading };
}
