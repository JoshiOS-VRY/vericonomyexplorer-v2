"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { RecentBlocksByChain } from "@/components/explorer/ExplorerSearchCombobox";
import { fetchLatestBlocks } from "@/lib/api/client";
import type { ChainSummary } from "@/lib/api/types";

const SearchRecentBlocksContext = createContext<RecentBlocksByChain | null>(null);

export function SearchRecentBlocksProvider({
  initialVrmSummary,
  initialVrcSummary,
  children,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
  children: ReactNode;
}) {
  const [recentBlocks, setRecentBlocks] = useState<RecentBlocksByChain>(() => ({
    vrm: initialVrmSummary?.latestBlocks ?? [],
    vrc: initialVrcSummary?.latestBlocks ?? [],
  }));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [vrmBlocks, vrcBlocks] = await Promise.all([
          initialVrmSummary
            ? Promise.resolve(initialVrmSummary.latestBlocks ?? [])
            : fetchLatestBlocks("vrm"),
          initialVrcSummary
            ? Promise.resolve(initialVrcSummary.latestBlocks ?? [])
            : fetchLatestBlocks("vrc"),
        ]);
        if (cancelled) return;
        setRecentBlocks({
          vrm: vrmBlocks,
          vrc: vrcBlocks,
        });
      } catch {
        // Keep seeded or empty lists on failure.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialVrmSummary, initialVrcSummary]);

  return (
    <SearchRecentBlocksContext.Provider value={recentBlocks}>
      {children}
    </SearchRecentBlocksContext.Provider>
  );
}

export function useSearchRecentBlocks() {
  return useContext(SearchRecentBlocksContext);
}
