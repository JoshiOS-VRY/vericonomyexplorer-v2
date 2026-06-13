'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { fetchBlocksPageClient, fetchLatestBlocks } from '@/lib/api/client';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { IndexedBlock } from '@/lib/api/types';
import { LATEST_BLOCKS_COUNT, LATEST_BLOCKS_POLL_MS } from '@/lib/chainBlocksDisplay';
import type { ChainId } from '@/lib/chainDisplay';
import {
  areDisplayBlocksEqual,
  createOptimisticTipBlock,
  enrichBlocksFromPrevious,
  isIndexedBlockTableReady,
  isOptimisticTipBlock,
  mergeBlocksForDisplay,
  shouldApplyOptimisticTip,
} from '@/lib/liveBlocksMerge';

export function useLatestBlocksPoll(
  chainId: ChainId,
  seedBlocks: IndexedBlock[] = [],
  chainHeight?: number | null,
  maxCount: number = LATEST_BLOCKS_COUNT
) {
  const visible = usePageVisible();
  const { subscribe } = useTipStream(chainId);
  const [blocks, setBlocks] = useState<IndexedBlock[]>(() =>
    mergeBlocksForDisplay(seedBlocks.slice(0, maxCount), chainId)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const chainHeightRef = useRef(chainHeight);
  const seedSignature = useMemo(
    () =>
      seedBlocks
        .slice(0, maxCount)
        .map((block) => `${block.height}:${block.hash}`)
        .join('|'),
    [maxCount, seedBlocks]
  );

  const applyDisplayBlocks = useCallback(
    (prev: IndexedBlock[], incoming: IndexedBlock[]) => {
      const merged = mergeBlocksForDisplay(
        enrichBlocksFromPrevious(prev, incoming, maxCount),
        chainId,
        maxCount
      );
      if (areDisplayBlocksEqual(merged, prev)) {
        return prev;
      }
      return merged;
    },
    [chainId, maxCount]
  );

  useEffect(() => {
    setBlocks((prev) => applyDisplayBlocks(prev, seedBlocks));
  }, [applyDisplayBlocks, seedBlocks, seedSignature]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    return subscribe(chainId, (tip) => {
      setBlocks((prev) => {
        const topHeight = prev[0]?.height ?? null;
        if (!shouldApplyOptimisticTip(tip.height, topHeight)) {
          return prev;
        }
        return applyDisplayBlocks(prev, [createOptimisticTipBlock(tip)]);
      });
    });
  }, [applyDisplayBlocks, chainId, subscribe, visible]);

  const refresh = useCallback(async () => {
    if (!visible || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const next =
        maxCount > LATEST_BLOCKS_COUNT
          ? (
              await fetchBlocksPageClient(chainId, {
                limit: maxCount,
                offset: 0,
              })
            ).items
          : await fetchLatestBlocks(chainId, { limit: maxCount });
      setBlocks((prev) => applyDisplayBlocks(prev, next));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh blocks');
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [applyDisplayBlocks, chainId, maxCount, visible]);

  useEffect(() => {
    const top = seedBlocks[0];
    if (top && !isIndexedBlockTableReady(top, chainId)) {
      void refresh();
    }
  }, [chainId, refresh, seedBlocks, seedSignature]);

  const indexingTip = blocks[0] != null && isOptimisticTipBlock(blocks[0], chainId);

  useEffect(() => {
    if (!visible || !indexingTip) {
      return;
    }

    void refresh();
    const fastPoll = window.setInterval(() => {
      void refresh();
    }, LATEST_BLOCKS_POLL_MS);

    return () => window.clearInterval(fastPoll);
  }, [chainId, indexingTip, refresh, visible]);

  useEffect(() => {
    if (
      chainHeight != null &&
      chainHeightRef.current != null &&
      chainHeight > chainHeightRef.current
    ) {
      void refresh();
    }
    chainHeightRef.current = chainHeight ?? chainHeightRef.current;
  }, [chainHeight, refresh]);

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
