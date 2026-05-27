import type { IndexedBlock } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

export function formatBlockConfirmationLabel(confirmations: number | null | undefined): string {
  if (confirmations == null || !Number.isFinite(confirmations)) {
    return "Confirmations unavailable";
  }

  if (confirmations <= 1) {
    return "Confirmed · 1 confirmation";
  }

  return `Confirmed · ${formatNumber(confirmations)} confirmations`;
}

export function isTipBlock(nextHash?: string | null): boolean {
  return !nextHash;
}

export function minerDisplayName(block: Pick<IndexedBlock, "extractedBy" | "extractedByAddress">): string {
  if (block.extractedByAddress) {
    return block.extractedByAddress;
  }

  if (block.extractedBy) {
    return block.extractedBy;
  }

  return "Unknown";
}

export function formatAmountPair(amount: { amount: string; ticker: string }): string {
  return `${amount.amount} ${amount.ticker}`;
}
