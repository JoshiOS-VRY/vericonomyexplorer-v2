"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  chainLiveStore,
  snapshotFromSummary,
  type ChainId,
  type ChainLiveSnapshot,
} from "@/lib/chainLive/store";
import type { ChainSummary } from "@/lib/api/types";

function canReuseServerSnapshot(
  live: ChainLiveSnapshot,
  server: ChainLiveSnapshot,
): boolean {
  return (
    live.summary === server.summary &&
    live.latestBlocks === server.latestBlocks &&
    live.chainHeight === server.chainHeight &&
    live.addressCount === server.addressCount
  );
}

export function useChainLiveSnapshot(
  chainId: ChainId,
  initialSummary?: ChainSummary | null,
): ChainLiveSnapshot {
  const serverSnapshot = useMemo(
    () => snapshotFromSummary(chainId, initialSummary),
    [chainId, initialSummary],
  );

  chainLiveStore.ensureChain(chainId, initialSummary);

  return useSyncExternalStore(
    (listener) => chainLiveStore.subscribe(chainId, listener),
    () => {
      const live = chainLiveStore.getSnapshot(chainId);
      return canReuseServerSnapshot(live, serverSnapshot)
        ? serverSnapshot
        : live;
    },
    () => serverSnapshot,
  );
}
