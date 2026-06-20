import { VERIUM_POOL_PAYOUT_ADDRESS } from '@/lib/veriumPoolExtracted';

/** Distinct, theme-friendly palette for miner share / distribution charts. */
export const MINER_CHART_PALETTE = [
  '#418bca',
  '#586a7a',
  '#359b37',
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#0ea5e9',
  '#64748b',
] as const;

export const MINER_CHART_OTHERS_COLOR = '#94a3b8';

export function getMinerSeriesColor(seriesId: string, index: number): string {
  if (seriesId === '__others__') {
    return MINER_CHART_OTHERS_COLOR;
  }

  if (seriesId === VERIUM_POOL_PAYOUT_ADDRESS) {
    return MINER_CHART_PALETTE[0];
  }

  return MINER_CHART_PALETTE[index % MINER_CHART_PALETTE.length] ?? MINER_CHART_OTHERS_COLOR;
}
