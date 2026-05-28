"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTipStream } from "@/components/explorer/TipStreamProvider";
import { fetchChainSummary, fetchLatestBlocks } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";

const HIGHLIGHT_MS = 5_000;
const SUMMARY_REFRESH_DEBOUNCE_MS = 2_000;

function mergeLatestBlocks(
  prevBlocks: IndexedBlock[],
  nextBlocks: IndexedBlock[],
): IndexedBlock[] {
  const prevByHash = new Map(prevBlocks.map((block) => [block.hash, block]));

  return nextBlocks.map((block) => {
    const prev = prevByHash.get(block.hash);
    if (!prev) {
      return block;
    }

    return {
      ...block,
      extractedBy: block.extractedBy ?? prev.extractedBy ?? null,
      extractedByAddress:
        block.extractedByAddress ?? prev.extractedByAddress ?? null,
      difficulty: block.difficulty ?? prev.difficulty,
      size: block.size ?? prev.size,
    };
  });
}

export interface LiveChainState {
  summary: ChainSummary;
  chainHeight: number | null;
  addressCount: number;
  latestBlocks: IndexedBlock[];
  newBlockHashes: Set<string>;
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

  const [summary, setSummary] = useState(initialSummary);
  const [newBlockHashes, setNewBlockHashes] = useState<Set<string>>(new Set());
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
            latestBlocks: mergeLatestBlocks(
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
            latestBlocks: mergeLatestBlocks(
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
        setNewBlockHashes(new Set(incomingNew.map((block) => block.hash)));

        window.setTimeout(() => {
          setNewBlockHashes(new Set());
        }, HIGHLIGHT_MS);
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
      const mergedBlocks = mergeLatestBlocks(prev.latestBlocks, blocks);
      const topHeight = mergedBlocks[0]?.height ?? null;
      const incomingNew = mergedBlocks.filter(
        (block) => !knownHashesRef.current.has(block.hash),
      );

      if (incomingNew.length > 0) {
        incomingNew.forEach((block) => knownHashesRef.current.add(block.hash));
        setNewBlockHashes(new Set(incomingNew.map((block) => block.hash)));

        window.setTimeout(() => {
          setNewBlockHashes(new Set());
        }, HIGHLIGHT_MS);
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

    setIsRefreshing(true);
    try {
      const next = await fetchChainSummary(chainId);
      applySummary(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  }, [applySummary, chainId, visible]);

  const refreshLatestBlocks = useCallback(async () => {
    if (!visible) {
      return;
    }

    try {
      const blocks = await fetchLatestBlocks(chainId);
      applyLatestBlocks(blocks);
    } catch (err) {
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

        const optimisticBlock: IndexedBlock = {
          height: tip.height,
          hash: tip.hash,
          time: tip.time,
          txCount: 0,
        };

        if (!knownHashesRef.current.has(tip.hash)) {
          knownHashesRef.current.add(tip.hash);
          setNewBlockHashes(new Set([tip.hash]));

          window.setTimeout(() => {
            setNewBlockHashes(new Set());
          }, HIGHLIGHT_MS);
        }

        if (tipRef.current != null && tip.height > tipRef.current) {
          setHeightPulse(true);
          window.setTimeout(() => setHeightPulse(false), 700);
        }
        tipRef.current = tip.height;

        return {
          ...prev,
          latestBlocks: [optimisticBlock, ...prev.latestBlocks].slice(0, 10),
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
      void refreshLatestBlocks();
      scheduleSummaryRefresh();
    });
  }, [
    applyOptimisticTip,
    chainId,
    refreshLatestBlocks,
    scheduleSummaryRefresh,
    subscribe,
    visible,
  ]);

  useEffect(
    () => () => {
      if (summaryRefreshTimerRef.current) {
        window.clearTimeout(summaryRefreshTimerRef.current);
      }
    },
    [],
  );

  const chainHeight =
    summary.health.heights.bestRpcHeight ??
    summary.health.heights.maxIndexedHeight;

  return {
    summary,
    chainHeight,
    addressCount: summary.health.counts.addressCount,
    latestBlocks: summary.latestBlocks,
    newBlockHashes,
    heightPulse,
    lastUpdated,
    isRefreshing,
    error,
  };
}
