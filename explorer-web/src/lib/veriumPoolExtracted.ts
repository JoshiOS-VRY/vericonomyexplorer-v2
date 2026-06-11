import type { IndexedBlock } from '@/lib/api/types';

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

export function veriumPoolPillClassName(className?: string): string {
  return className ? `extracted-by-verium-pool ${className}` : 'extracted-by-verium-pool';
}
