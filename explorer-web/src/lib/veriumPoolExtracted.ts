import type { IndexedBlock } from "@/lib/api/types";

/** Vericonomy-operated pool (coinbase tag /VRMPOOL/ or pool payout address). */
export const VERIUM_POOL_DISPLAY_NAME = "Verium Pool";
export const VERIUM_POOL_SITE_HOST = "pool.vericonomy.com";

export function isVeriumPoolExtracted(
  block: Pick<IndexedBlock, "extractedBy" | "extractedByLink">,
): boolean {
  if (block.extractedBy === VERIUM_POOL_DISPLAY_NAME) {
    return true;
  }

  const link = block.extractedByLink?.trim().toLowerCase() ?? "";
  return link.includes(VERIUM_POOL_SITE_HOST);
}
