"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { RecentBlocksByChain } from "@/components/explorer/ExplorerSearchCombobox";
import { chainLiveStore, snapshotFromSummary } from "@/lib/chainLive/store";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";
import { filterTableReadyBlocks } from "@/lib/liveBlocksMerge";

const SearchRecentBlocksContext = createContext<RecentBlocksByChain | null>(null);

let cachedRecentBlocks: RecentBlocksByChain | null = null;
let cachedVrmBlocks: IndexedBlock[] | null = null;
let cachedVrcBlocks: IndexedBlock[] | null = null;

function subscribeRecentBlocks(listener: () => void): () => void {
  const unsubs = (["vrm", "vrc"] as const).map((chainId) =>
    chainLiveStore.subscribe(chainId, listener),
  );
  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

function recentBlocksFromSummaries(
  initialVrm?: ChainSummary | null,
  initialVrc?: ChainSummary | null,
): RecentBlocksByChain {
  return {
    vrm: snapshotFromSummary("vrm", initialVrm).latestBlocks,
    vrc: snapshotFromSummary("vrc", initialVrc).latestBlocks,
  };
}

function getRecentBlocksSnapshot(): RecentBlocksByChain {
  const vrm = filterTableReadyBlocks(
    chainLiveStore.getSnapshot("vrm").latestBlocks,
    "vrm",
  );
  const vrc = filterTableReadyBlocks(
    chainLiveStore.getSnapshot("vrc").latestBlocks,
    "vrc",
  );

  if (
    cachedRecentBlocks &&
    cachedVrmBlocks === vrm &&
    cachedVrcBlocks === vrc
  ) {
    return cachedRecentBlocks;
  }

  cachedVrmBlocks = vrm;
  cachedVrcBlocks = vrc;
  cachedRecentBlocks = { vrm, vrc };
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
  chainLiveStore.ensureChain("vrm", initialVrmSummary);
  chainLiveStore.ensureChain("vrc", initialVrcSummary);

  const serverSnapshot = useMemo(
    () => recentBlocksFromSummaries(initialVrmSummary, initialVrcSummary),
    [initialVrmSummary, initialVrcSummary],
  );

  const getClientSnapshot = () => {
    const live = getRecentBlocksSnapshot();
    if (
      live.vrm === serverSnapshot.vrm &&
      live.vrc === serverSnapshot.vrc
    ) {
      return serverSnapshot;
    }
    return live;
  };

  const recentBlocks = useSyncExternalStore(
    subscribeRecentBlocks,
    getClientSnapshot,
    () => serverSnapshot,
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
