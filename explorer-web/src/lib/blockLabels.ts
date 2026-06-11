import type { IndexedBlock } from '@/lib/api/types';
import { formatCoinAmount, formatNumber } from '@/lib/utils';

export function formatBlockConfirmationLabel(confirmations: number | null | undefined): string {
  const count =
    confirmations == null || !Number.isFinite(confirmations) ? 1 : Math.max(0, confirmations);

  if (count <= 0) {
    return 'Unconfirmed';
  }

  if (count === 1) {
    return 'Confirmed · 1 confirmation';
  }

  return `Confirmed · ${formatNumber(count)} confirmations`;
}

export function isTipBlock(nextHash?: string | null): boolean {
  return !nextHash;
}

export function minerDisplayName(
  block: Pick<IndexedBlock, 'extractedBy' | 'extractedByAddress'>
): string {
  if (block.extractedBy) {
    return block.extractedBy;
  }

  if (block.extractedByAddress) {
    return block.extractedByAddress;
  }

  return 'Unknown';
}

export function formatAmountPair(amount: { amount: string; ticker: string }): string {
  return `${formatCoinAmount(amount.amount)} ${amount.ticker}`;
}
