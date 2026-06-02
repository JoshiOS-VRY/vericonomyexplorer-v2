import type { IndexedBlock } from "@/lib/api/types";

/**
 * Choose the base list for the first blocks page.
 *
 * The indexed fill page (`/blocks` offset 0) is only preferred when it reaches
 * at least as high as the live RPC blocks. When the indexer lags far behind the
 * chain tip, its top row can be hundreds of thousands of blocks old, so we fall
 * back to the live blocks which always reflect the current tip.
 */
export function pickBlockPageBase(
  filledPage: IndexedBlock[] | null,
  liveBlocks: IndexedBlock[],
): IndexedBlock[] {
  if (filledPage != null && filledPage.length > 0) {
    const filledTop = filledPage[0]?.height ?? Number.NEGATIVE_INFINITY;
    const liveTop = liveBlocks[0]?.height ?? Number.NEGATIVE_INFINITY;
    if (filledTop >= liveTop) {
      return filledPage;
    }
  }

  return liveBlocks;
}
