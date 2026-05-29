"use client";

import { useSyncExternalStore } from "react";
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
  // Seed synchronously so getSnapshot returns a stable reference before subscribe.
  chainLiveStore.ensureChain(chainId, initialSummary);

  return useSyncExternalStore(
    (listener) => chainLiveStore.subscribe(chainId, listener),
    () => chainLiveStore.getSnapshot(chainId),
    () => chainLiveStore.getSnapshot(chainId),
  );
}
