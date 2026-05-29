"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  chainLiveStore,
  type ChainId,
  type ChainLiveSnapshot,
} from "@/lib/chainLive/store";
import type { ChainSummary } from "@/lib/api/types";

export function useChainLiveSnapshot(
  chainId: ChainId,
  initialSummary?: ChainSummary | null,
): ChainLiveSnapshot {
  useEffect(() => {
    chainLiveStore.ensureChain(chainId, initialSummary);
  }, [chainId, initialSummary]);

  return useSyncExternalStore(
    (listener) => chainLiveStore.subscribe(chainId, listener),
    () => chainLiveStore.getSnapshot(chainId),
    () => chainLiveStore.getSnapshot(chainId),
  );
}
