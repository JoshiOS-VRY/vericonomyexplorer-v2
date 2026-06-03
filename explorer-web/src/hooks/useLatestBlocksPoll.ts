"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLatestBlocks } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { IndexedBlock } from "@/lib/api/types";
import {
  LATEST_BLOCKS_COUNT,
  LATEST_BLOCKS_POLL_MS,
} from "@/lib/chainBlocksDisplay";
import type { ChainId } from "@/lib/chainDisplay";
import { enrichBlocksFromPrevious } from "@/lib/liveBlocksMerge";

export function useLatestBlocksPoll(
  chainId: ChainId,
  seedBlocks: IndexedBlock[] = [],
) {
  const visible = usePageVisible();
  const [blocks, setBlocks] = useState<IndexedBlock[]>(() =>
    seedBlocks.slice(0, LATEST_BLOCKS_COUNT),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setBlocks((prev) =>
      enrichBlocksFromPrevious(prev, seedBlocks, LATEST_BLOCKS_COUNT),
    );
  }, [seedBlocks]);

  const refresh = useCallback(async () => {
    if (!visible || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const next = await fetchLatestBlocks(chainId);
      setBlocks((prev) =>
        enrichBlocksFromPrevious(prev, next, LATEST_BLOCKS_COUNT),
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh blocks",
      );
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [chainId, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, LATEST_BLOCKS_POLL_MS);

    return () => window.clearInterval(interval);
  }, [refresh, visible]);

  return { blocks, isRefreshing, error, refresh };
}
