"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { RecentBlocksByChain } from "@/components/explorer/ExplorerSearchCombobox";
import { chainLiveStore } from "@/lib/chainLive/store";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";

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

function getRecentBlocksSnapshot(): RecentBlocksByChain {
  const vrm = chainLiveStore.getSnapshot("vrm").latestBlocks;
  const vrc = chainLiveStore.getSnapshot("vrc").latestBlocks;

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

  const recentBlocks = useSyncExternalStore(
    subscribeRecentBlocks,
    getRecentBlocksSnapshot,
    getRecentBlocksSnapshot,
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
