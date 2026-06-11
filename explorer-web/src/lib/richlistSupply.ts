import type { ChainMarket } from '@/lib/api/types';

/** Total supply for rich-list share bars and the "Top N hold X%" footer. */
export function resolveRichlistTotalSupply(
  networkSupply: number | null | undefined,
  market?: ChainMarket | null
): number | null {
  if (networkSupply != null && networkSupply > 0) {
    return networkSupply;
  }

  const circulating = market?.circulatingSupply;
  if (circulating != null && circulating > 0) {
    return circulating;
  }

  const cap = market?.marketCap;
  const price = market?.usd;
  if (cap != null && price != null && price > 0) {
    const derived = cap / price;
    return Number.isFinite(derived) && derived > 0 ? derived : null;
  }

  return null;
}
