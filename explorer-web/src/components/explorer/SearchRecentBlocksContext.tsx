'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { RecentBlocksByChain } from '@/components/explorer/ExplorerSearchCombobox';
import { chainLiveStore, snapshotFromSummary } from '@/lib/chainLive/store';
import type { ChainSummary, IndexedBlock } from '@/lib/api/types';
import { filterTableReadyBlocks } from '@/lib/liveBlocksMerge';

const SearchRecentBlocksContext = createContext<RecentBlocksByChain | null>(null);

let cachedRecentBlocks: RecentBlocksByChain | null = null;
let cachedVrmSource: IndexedBlock[] | null = null;
let cachedVrcSource: IndexedBlock[] | null = null;

function subscribeRecentBlocks(listener: () => void): () => void {
  const unsubs = (['vrm', 'vrc'] as const).map((chainId) =>
    chainLiveStore.subscribe(chainId, listener)
  );
  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

function recentBlocksFromSummaries(
  initialVrm?: ChainSummary | null,
  initialVrc?: ChainSummary | null
): RecentBlocksByChain {
  return {
    vrm: snapshotFromSummary('vrm', initialVrm).latestBlocks,
    vrc: snapshotFromSummary('vrc', initialVrc).latestBlocks,
  };
}

function getRecentBlocksSnapshot(): RecentBlocksByChain {
  const vrmSource = chainLiveStore.getSnapshot('vrm').latestBlocks;
  const vrcSource = chainLiveStore.getSnapshot('vrc').latestBlocks;

  if (cachedRecentBlocks && cachedVrmSource === vrmSource && cachedVrcSource === vrcSource) {
    return cachedRecentBlocks;
  }

  cachedVrmSource = vrmSource;
  cachedVrcSource = vrcSource;
  cachedRecentBlocks = {
    vrm: filterTableReadyBlocks(vrmSource, 'vrm'),
    vrc: filterTableReadyBlocks(vrcSource, 'vrc'),
  };
  return cachedRecentBlocks;
}

export function SearchRecentBlocksProvider({
  children,
  initialVrmSummary,
  initialVrcSummary,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    chainLiveStore.ensureChain('vrm', initialVrmSummary, true);
    chainLiveStore.ensureChain('vrc', initialVrcSummary, true);
  }, [initialVrmSummary, initialVrcSummary]);

  const serverSnapshot = useMemo(
    () => recentBlocksFromSummaries(initialVrmSummary, initialVrcSummary),
    [initialVrmSummary, initialVrcSummary]
  );

  const recentBlocks = useSyncExternalStore(
    subscribeRecentBlocks,
    getRecentBlocksSnapshot,
    () => serverSnapshot
  );

  return (
    <SearchRecentBlocksContext.Provider value={recentBlocks}>
      {children}
    </SearchRecentBlocksContext.Provider>
  );
}

export function useSearchRecentBlocks() {
  return useContext(SearchRecentBlocksContext);
}
