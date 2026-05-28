"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChainTipState, useTipStream } from "@/components/explorer/TipStreamProvider";
import { fetchChainSummary } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ChainHealth, ChainSummary } from "@/lib/api/types";
import {
  getChainSyncLabel,
  getChainTipHeight,
  isChainAtTip,
} from "@/lib/chainDisplay";

const SYNC_REFRESH_DEBOUNCE_MS = 2_000;

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
  const [loading, setLoading] = useState(initialSeed == null);
  const refreshTimerRef = useRef<number | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, [chainId, visible]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, SYNC_REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    return subscribe(chainId, () => {
      scheduleRefresh();
    });
  }, [chainId, scheduleRefresh, subscribe, visible]);

  useEffect(
    () => () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );

  const liveTipHeight = streamTipHeight ?? health?.heights.bestRpcHeight ?? null;
  const live =
    health != null && isChainAtTip(health, latestBlockHeight, liveTipHeight);
  const height =
    liveTipHeight ?? (health ? getChainTipHeight(health) : null);
  const label =
    loading || health == null
      ? null
      : getChainSyncLabel(health, latestBlockHeight, liveTipHeight);

  return { live, height, label, loading };
}
