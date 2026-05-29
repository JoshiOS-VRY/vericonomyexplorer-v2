"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTipStream } from "@/components/explorer/TipStreamProvider";
import { fetchChainSummary, fetchLatestBlocks } from "@/lib/api/client";
import { getChainTipHeight } from "@/lib/chainDisplay";
import {
  enrichBlocksFromPrevious,
  shouldApplyFetchedBlocks,
  shouldApplyOptimisticTip,
} from "@/lib/liveBlocksMerge";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";

const SUMMARY_REFRESH_DEBOUNCE_MS = 2_000;
const BLOCKS_REFRESH_DEBOUNCE_MS = 400;
const SUMMARY_POLL_MS = 30_000;
const MAX_LATEST_BLOCKS = 10;

export interface LiveChainState {
  summary: ChainSummary;
  chainHeight: number | null;
  addressCount: number;
  latestBlocks: IndexedBlock[];
  heightPulse: boolean;
  lastUpdated: number;
  isRefreshing: boolean;
  error: string | null;
}

export function useLiveChainSummary(
  chainId: string,
  initialSummary: ChainSummary,
): LiveChainState {
  const { subscribe } = useTipStream(chainId);
  const visible = usePageVisible();
  const knownHashesRef = useRef(
    new Set(initialSummary.latestBlocks.map((b) => b.hash)),
  );
  const tipRef = useRef<number | null>(
    initialSummary.health.heights.bestRpcHeight ??
      initialSummary.health.heights.maxIndexedHeight,
  );
  const summaryRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const blocksRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const summaryFetchGenRef = useRef(0);
  const blocksFetchGenRef = useRef(0);

  const [summary, setSummary] = useState(initialSummary);
  const [heightPulse, setHeightPulse] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySummary = useCallback((next: ChainSummary) => {
    setSummary((prev) => {
      const prevTopHeight = prev.latestBlocks[0]?.height ?? null;
      const nextTopHeight = next.latestBlocks[0]?.height ?? null;
      const usePrevBlocks =
        prevTopHeight != null &&
        (nextTopHeight == null || prevTopHeight > nextTopHeight);
      const merged: ChainSummary = usePrevBlocks
        ? {
            ...next,
            latestBlocks: enrichBlocksFromPrevious(
              prev.latestBlocks,
              next.latestBlocks,
            ),
            health: {
              ...next.health,
              heights: {
                ...next.health.heights,
                bestRpcHeight: Math.max(
                  next.health.heights.bestRpcHeight ?? 0,
                  prev.health.heights.bestRpcHeight ?? 0,
                  prevTopHeight,
                ),
              },
            },
          }
        : {
            ...next,
            latestBlocks: enrichBlocksFromPrevious(
              prev.latestBlocks,
              next.latestBlocks,
            ),
          };

      const nextHeight =
        merged.health.heights.bestRpcHeight ??
        merged.health.heights.maxIndexedHeight;
      const incomingNew = merged.latestBlocks.filter(
        (block) => !knownHashesRef.current.has(block.hash),
      );

      if (incomingNew.length > 0) {
        incomingNew.forEach((block) => knownHashesRef.current.add(block.hash));
      }

      merged.latestBlocks.forEach((block) =>
        knownHashesRef.current.add(block.hash),
      );

      if (
        nextHeight != null &&
        tipRef.current != null &&
        nextHeight > tipRef.current
      ) {
        setHeightPulse(true);
        window.setTimeout(() => setHeightPulse(false), 700);
      }

      if (nextHeight != null) {
        tipRef.current = nextHeight;
      }

      setLastUpdated(Date.now());
      setError(null);
      return merged;
    });
  }, []);

  const applyLatestBlocks = useCallback((blocks: IndexedBlock[]) => {
    setSummary((prev) => {
      const fetchedTop =
        blocks.length > 0
          ? Math.max(...blocks.map((block) => block.height))
          : null;
      const prevTop = prev.latestBlocks[0]?.height ?? null;
      if (!shouldApplyFetchedBlocks(fetchedTop, prevTop)) {
        return prev;
      }

      const mergedBlocks = enrichBlocksFromPrevious(prev.latestBlocks, blocks);
      const topHeight = mergedBlocks[0]?.height ?? null;
      const incomingNew = mergedBlocks.filter(
        (block) => !knownHashesRef.current.has(block.hash),
      );

      if (incomingNew.length > 0) {
        incomingNew.forEach((block) => knownHashesRef.current.add(block.hash));
      }

      mergedBlocks.forEach((block) => knownHashesRef.current.add(block.hash));

      if (
        topHeight != null &&
        tipRef.current != null &&
        topHeight > tipRef.current
      ) {
        setHeightPulse(true);
        window.setTimeout(() => setHeightPulse(false), 700);
      }

      if (topHeight != null) {
        tipRef.current = topHeight;
      }

      setLastUpdated(Date.now());
      setError(null);

      return {
        ...prev,
        latestBlocks: mergedBlocks,
        health: topHeight
          ? {
              ...prev.health,
              heights: {
                ...prev.health.heights,
                bestRpcHeight: Math.max(
                  prev.health.heights.bestRpcHeight ?? 0,
                  topHeight,
                ),
              },
            }
          : prev.health,
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!visible) {
      return;
    }

    const fetchGen = ++summaryFetchGenRef.current;
    setIsRefreshing(true);
    try {
      const next = await fetchChainSummary(chainId);
      if (fetchGen !== summaryFetchGenRef.current) {
        return;
      }
      applySummary(next);
    } catch (err) {
      if (fetchGen !== summaryFetchGenRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      if (fetchGen === summaryFetchGenRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [applySummary, chainId, visible]);

  const refreshLatestBlocks = useCallback(async () => {
    if (!visible) {
      return;
    }

    const fetchGen = ++blocksFetchGenRef.current;
    try {
      const blocks = await fetchLatestBlocks(chainId);
      if (fetchGen !== blocksFetchGenRef.current) {
        return;
      }
      applyLatestBlocks(blocks);
    } catch (err) {
      if (fetchGen !== blocksFetchGenRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to refresh blocks");
    }
  }, [applyLatestBlocks, chainId, visible]);

  const scheduleSummaryRefresh = useCallback(() => {
    if (summaryRefreshTimerRef.current) {
      window.clearTimeout(summaryRefreshTimerRef.current);
    }

    summaryRefreshTimerRef.current = window.setTimeout(() => {
      summaryRefreshTimerRef.current = null;
      void refresh();
    }, SUMMARY_REFRESH_DEBOUNCE_MS) as unknown as ReturnType<typeof setTimeout>;
  }, [refresh]);

  const scheduleBlocksRefresh = useCallback(() => {
    if (blocksRefreshTimerRef.current) {
      window.clearTimeout(blocksRefreshTimerRef.current);
    }

    blocksRefreshTimerRef.current = window.setTimeout(() => {
      blocksRefreshTimerRef.current = null;
      void refreshLatestBlocks();
    }, BLOCKS_REFRESH_DEBOUNCE_MS) as unknown as ReturnType<typeof setTimeout>;
  }, [refreshLatestBlocks]);

  const applyOptimisticTip = useCallback(
    (tip: { height: number; hash: string; time: number }) => {
      setSummary((prev) => {
        const top = prev.latestBlocks[0];
        if (top && tip.height <= top.height) {
          return prev;
        }
        if (prev.latestBlocks.some((block) => block.hash === tip.hash)) {
          return prev;
        }

        const nextBlocks = shouldApplyOptimisticTip(tip.height, top?.height ?? null)
          ? [
              {
                height: tip.height,
                hash: tip.hash,
                time: tip.time,
                txCount: 0,
              } satisfies IndexedBlock,
              ...prev.latestBlocks,
            ].slice(0, MAX_LATEST_BLOCKS)
          : prev.latestBlocks;

        if (!knownHashesRef.current.has(tip.hash)) {
          knownHashesRef.current.add(tip.hash);
        }

        if (tipRef.current != null && tip.height > tipRef.current) {
          setHeightPulse(true);
          window.setTimeout(() => setHeightPulse(false), 700);
        }
        tipRef.current = tip.height;

        return {
          ...prev,
          latestBlocks: nextBlocks,
          health: {
            ...prev.health,
            heights: {
              ...prev.health.heights,
              bestRpcHeight: tip.height,
            },
          },
        };
      });
    },
    [],
  );

  const minerRefreshAttemptedRef = useRef(false);

  useEffect(() => {
    if (!visible || minerRefreshAttemptedRef.current) {
      return;
    }

    minerRefreshAttemptedRef.current = true;

    const needsMiner = initialSummary.latestBlocks.some(
      (block) => !block.extractedBy && !block.extractedByAddress,
    );
    if (needsMiner) {
      scheduleSummaryRefresh();
    }
  }, [initialSummary, scheduleSummaryRefresh, visible]);

  // Refetch when the home band mounts or the tab becomes visible again (client
  // navigations can reuse stale RSC shell data until we pull fresh summaries).
  useEffect(() => {
    if (!visible) {
      return;
    }

    void refresh();
    void refreshLatestBlocks();
  }, [refresh, refreshLatestBlocks, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    return subscribe(chainId, (tip) => {
      applyOptimisticTip(tip);
      scheduleBlocksRefresh();
      scheduleSummaryRefresh();
    });
  }, [
    applyOptimisticTip,
    chainId,
    scheduleBlocksRefresh,
    scheduleSummaryRefresh,
    subscribe,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
      void refreshLatestBlocks();
    }, SUMMARY_POLL_MS);

    return () => window.clearInterval(interval);
  }, [refresh, refreshLatestBlocks, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const maxIndexed = summary.health.heights.maxIndexedHeight;
    const blockTop = summary.latestBlocks[0]?.height;
    if (
      maxIndexed != null &&
      blockTop != null &&
      maxIndexed > blockTop
    ) {
      void refreshLatestBlocks();
    }
  }, [
    refreshLatestBlocks,
    summary.health.heights.maxIndexedHeight,
    summary.latestBlocks,
    visible,
  ]);

  useEffect(
    () => () => {
      if (summaryRefreshTimerRef.current) {
        window.clearTimeout(summaryRefreshTimerRef.current);
      }
      if (blocksRefreshTimerRef.current) {
        window.clearTimeout(blocksRefreshTimerRef.current);
      }
    },
    [],
  );

  const chainHeight = getChainTipHeight(summary.health);

  return {
    summary,
    chainHeight,
    addressCount: summary.health.counts.addressCount,
    latestBlocks: summary.latestBlocks,
    heightPulse,
    lastUpdated,
    isRefreshing,
    error,
  };
}
