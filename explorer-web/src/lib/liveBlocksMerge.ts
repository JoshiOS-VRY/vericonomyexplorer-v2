import type { IndexedBlock } from "@/lib/api/types";

const MAX_LATEST_BLOCKS = 10;

export function shouldApplyOptimisticTip(
  tipHeight: number,
  topHeight: number | null,
): boolean {
  if (topHeight == null) {
    return true;
  }

  return tipHeight === topHeight + 1;
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
  maxCount = MAX_LATEST_BLOCKS,
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
