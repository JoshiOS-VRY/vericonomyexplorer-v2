import type { IndexedBlock } from "@/lib/api/types";

export function pickBlockPageBase(
  filledPage: IndexedBlock[] | null,
  liveBlocks: IndexedBlock[],
): IndexedBlock[] {
  if (filledPage != null && filledPage.length > 0) {
    return filledPage;
  }

  return liveBlocks;
}
