"use client";

import { useCallback, useEffect, useState } from "react";
import { useChainTipState, useTipStream } from "@/components/explorer/TipStreamProvider";
import { fetchChainSummary } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ChainHealth, ChainSummary } from "@/lib/api/types";
import {
  getChainSyncLabel,
  getChainTipHeight,
  isChainAtTip,
} from "@/lib/chainDisplay";

export interface ChainSyncSeed {
  health: ChainHealth;
  latestBlockHeight: number | null;
}

function seedFromSummary(summary: ChainSummary | null | undefined): ChainSyncSeed | null {
  if (!summary) return null;
  return {
    health: summary.health,
    latestBlockHeight: summary.latestBlocks[0]?.height ?? null,
  };
}

export function useChainSyncStatus(
  chainId: "vrm" | "vrc",
  initialSummary?: ChainSummary | null,
) {
  const { subscribe } = useTipStream(chainId);
  const { height: streamTipHeight } = useChainTipState(chainId);
  const visible = usePageVisible();
  const initialSeed = seedFromSummary(initialSummary);
  const [health, setHealth] = useState<ChainHealth | null>(initialSeed?.health ?? null);
  const [latestBlockHeight, setLatestBlockHeight] = useState<number | null>(
    initialSeed?.latestBlockHeight ?? null,
  );

  const refresh = useCallback(async () => {
    if (!visible) {
      return;
    }

    try {
      const summary = await fetchChainSummary(chainId);
      setHealth(summary.health);
      setLatestBlockHeight(summary.latestBlocks[0]?.height ?? null);
    } catch {
      // Keep the last known good snapshot (often SSR-seeded) on transient failures.
    }
  }, [chainId, visible]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    return subscribe(chainId, () => {
      void refresh();
    });
  }, [chainId, refresh, subscribe, visible]);

  const liveTipHeight = streamTipHeight ?? health?.heights.bestRpcHeight ?? null;
  const live =
    health != null && isChainAtTip(health, latestBlockHeight, liveTipHeight);
  const height =
    liveTipHeight ?? (health ? getChainTipHeight(health) : null);
  const label = health
    ? getChainSyncLabel(health, latestBlockHeight, liveTipHeight)
    : "Offline";

  return { live, height, label };
}
