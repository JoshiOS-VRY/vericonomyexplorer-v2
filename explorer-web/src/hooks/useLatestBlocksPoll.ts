"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const seedSignature = useMemo(
    () =>
      seedBlocks
        .slice(0, LATEST_BLOCKS_COUNT)
        .map((block) => `${block.height}:${block.hash}`)
        .join("|"),
    [seedBlocks],
  );

  useEffect(() => {
    setBlocks((prev) => {
      const next = enrichBlocksFromPrevious(
        prev,
        seedBlocks,
        LATEST_BLOCKS_COUNT,
      );
      if (
        next.length === prev.length &&
        next.every((block, index) => block.hash === prev[index]?.hash)
      ) {
        return prev;
      }
      return next;
    });
  }, [seedBlocks, seedSignature]);

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
