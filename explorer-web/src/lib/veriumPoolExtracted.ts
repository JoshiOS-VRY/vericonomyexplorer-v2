import type { IndexedBlock } from '@/lib/api/types';
import { cn } from '@/lib/utils';

/** Vericonomy-operated pool (coinbase tag /VRMPOOL/ or pool payout address). */
export const VERIUM_POOL_DISPLAY_NAME = 'Verium Pool';
export const VERIUM_POOL_SITE_HOST = 'pool.vericonomy.com';
export const VERIUM_POOL_PAYOUT_ADDRESS = 'VRq98Nm2P6anLHPgnHdb6NnibJ6GoG3Jm9';

export function isVeriumPoolPayoutAddress(address: string | null | undefined): boolean {
  return typeof address === 'string' && address.trim() === VERIUM_POOL_PAYOUT_ADDRESS;
}

export function isVeriumPoolExtracted(
  block: Pick<IndexedBlock, 'extractedBy' | 'extractedByLink' | 'extractedByAddress'>
): boolean {
  if (block.extractedBy === VERIUM_POOL_DISPLAY_NAME) {
    return true;
  }

  if (isVeriumPoolPayoutAddress(block.extractedByAddress)) {
    return true;
  }

  const link = block.extractedByLink?.trim().toLowerCase() ?? '';
  return link.includes(VERIUM_POOL_SITE_HOST);
}

/** Matches verium/desktop ExplorerRecentBlockRow pool miner pill. */
export const VERIUM_POOL_PILL_BASE_CLASS =
  'verium-pool-badge inline-flex max-w-full shrink-0 items-center rounded-md bg-accent px-2.5 py-0.5 text-xs font-semibold text-white no-underline shadow-sm hover:bg-accent/90 hover:no-underline';

export function veriumPoolPillClassName(className?: string): string {
  return cn(VERIUM_POOL_PILL_BASE_CLASS, className);
}
