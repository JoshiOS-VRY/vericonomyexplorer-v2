'use client';

import type { ChainLiveSnapshot } from '@/lib/chainLive/store';
import { useChainLiveSnapshot } from '@/lib/chainLive/useChainLiveSnapshot';
import type { ChainSummary } from '@/lib/api/types';

export type LiveChainState = ChainLiveSnapshot;

export function useLiveChainSummary(chainId: string, initialSummary: ChainSummary): LiveChainState {
  return useChainLiveSnapshot(chainId as 'vrm' | 'vrc', initialSummary);
}
