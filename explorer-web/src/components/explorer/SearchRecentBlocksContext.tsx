"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { RecentBlocksByChain } from "@/components/explorer/ExplorerSearchCombobox";
import { chainLiveStore } from "@/lib/chainLive/store";
import type { ChainSummary } from "@/lib/api/types";

const SearchRecentBlocksContext = createContext<RecentBlocksByChain | null>(null);

function subscribeRecentBlocks(listener: () => void): () => void {
  const unsubs = (["vrm", "vrc"] as const).map((chainId) =>
    chainLiveStore.subscribe(chainId, listener),
  );
  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

function getRecentBlocksSnapshot(): RecentBlocksByChain {
  return {
    vrm: chainLiveStore.getSnapshot("vrm").latestBlocks,
    vrc: chainLiveStore.getSnapshot("vrc").latestBlocks,
  };
}

export function SearchRecentBlocksProvider({
  children,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
  children: ReactNode;
}) {
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
