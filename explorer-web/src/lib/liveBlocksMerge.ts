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

export function enrichBlocksFromPrevious(
  prevBlocks: IndexedBlock[],
  nextBlocks: IndexedBlock[],
  maxCount = MAX_LATEST_BLOCKS,
): IndexedBlock[] {
  const prevByHash = new Map(prevBlocks.map((block) => [block.hash, block]));

  return [...nextBlocks]
    .sort((a, b) => b.height - a.height)
    .slice(0, maxCount)
    .map((block) => {
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
