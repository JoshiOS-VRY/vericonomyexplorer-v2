import type { IndexedBlock } from "@/lib/api/types";
import { LATEST_BLOCKS_COUNT } from "@/lib/chainBlocksDisplay";
import type { ChainId } from "@/lib/chainDisplay";

/** True when a block has the fields required for latest-blocks tables (not a tip-stream stub). */
export function isIndexedBlockTableReady(
  block: IndexedBlock,
  chainId: ChainId,
): boolean {
  if (!Number.isFinite(block.height) || !block.hash?.trim()) {
    return false;
  }

  if (block.size == null || !block.difficulty) {
    return false;
  }

  if (chainId === "vrm") {
    return !!(
      block.extractedBy?.trim() || block.extractedByAddress?.trim()
    );
  }

  if (chainId === "vrc") {
    return (
      block.interestRatePercent != null &&
      Number.isFinite(block.interestRatePercent)
    );
  }

  return true;
}

export function filterTableReadyBlocks(
  blocks: IndexedBlock[],
  chainId: ChainId,
): IndexedBlock[] {
  return blocks.filter((block) => isIndexedBlockTableReady(block, chainId));
}

/** Tip-stream row: height/hash/time only until the indexer enriches the block. */
export function isOptimisticTipBlock(
  block: IndexedBlock,
  chainId: ChainId,
): boolean {
  return (
    !isIndexedBlockTableReady(block, chainId) &&
    Number.isFinite(block.height) &&
    !!block.hash?.trim() &&
    block.time != null &&
    Number.isFinite(block.time)
  );
}

export function createOptimisticTipBlock(tip: {
  height: number;
  hash: string;
  time: number;
}): IndexedBlock {
  return {
    height: tip.height,
    hash: tip.hash,
    time: tip.time,
    txCount: 0,
  };
}

/** Latest-blocks UI: full rows plus at most one optimistic tip stub at the top. */
export function mergeBlocksForDisplay(
  blocks: IndexedBlock[],
  chainId: ChainId,
  maxCount = LATEST_BLOCKS_COUNT,
): IndexedBlock[] {
  const sorted = [...blocks]
    .filter((block) => block.height != null)
    .sort((a, b) => b.height - a.height);

  const result: IndexedBlock[] = [];
  for (const block of sorted) {
    if (result.length >= maxCount) {
      break;
    }
    if (isIndexedBlockTableReady(block, chainId)) {
      result.push(block);
      continue;
    }
    if (result.length === 0 && isOptimisticTipBlock(block, chainId)) {
      result.push(block);
    }
  }

  return result;
}

export function shouldApplyOptimisticTip(
  tipHeight: number,
  topHeight: number | null,
): boolean {
  if (topHeight == null) {
    return true;
  }

  return tipHeight === topHeight + 1;
}

/** Whether two latest-blocks lists are equivalent for UI (hash-only checks miss enrichment). */
export function areDisplayBlocksEqual(
  a: IndexedBlock[],
  b: IndexedBlock[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((block, index) => {
    const other = b[index];
    if (!other) {
      return false;
    }

    return (
      block.height === other.height &&
      block.hash === other.hash &&
      block.time === other.time &&
      block.txCount === other.txCount &&
      block.size === other.size &&
      block.difficulty === other.difficulty &&
      block.interestRatePercent === other.interestRatePercent &&
      block.extractedBy === other.extractedBy &&
      block.extractedByAddress === other.extractedByAddress
    );
  });
}

export function shouldApplyFetchedBlocks(
  fetchedTop: number | null,
  currentTop: number | null,
): boolean {
  if (fetchedTop == null) {
    return false;
  }

  if (currentTop == null) {
    return true;
  }

  return fetchedTop >= currentTop;
}

/** Merge by height so a live poll that only returns the tip block never wipes indexed history. */
export function enrichBlocksFromPrevious(
  prevBlocks: IndexedBlock[],
  nextBlocks: IndexedBlock[],
  maxCount = LATEST_BLOCKS_COUNT,
): IndexedBlock[] {
  const byHeight = new Map<number, IndexedBlock>();

  for (const block of prevBlocks) {
    if (block.height != null) {
      byHeight.set(block.height, block);
    }
  }

  for (const block of nextBlocks) {
    if (block.height == null) {
      continue;
    }

    const height = block.height;
    const prev = byHeight.get(height);
    byHeight.set(
      height,
      prev
        ? {
            ...block,
            extractedBy: block.extractedBy ?? prev.extractedBy ?? null,
            extractedByAddress:
              block.extractedByAddress ?? prev.extractedByAddress ?? null,
            time: block.time ?? prev.time ?? null,
            txCount: block.txCount ?? prev.txCount,
            difficulty: block.difficulty ?? prev.difficulty,
            size: block.size ?? prev.size,
            interestRatePercent:
              block.interestRatePercent ?? prev.interestRatePercent ?? null,
          }
        : block,
    );
  }

  return [...byHeight.values()]
    .sort((a, b) => b.height - a.height)
    .slice(0, maxCount);
}
