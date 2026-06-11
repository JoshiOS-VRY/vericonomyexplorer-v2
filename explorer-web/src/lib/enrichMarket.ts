import type { ChainId } from '@/lib/chainDisplay';
import type { ChainMarket } from '@/lib/api/types';

/** VRC cap is always on-chain supply × USD; VRM fills cap only when external data lacks it. */
export function applyOnChainMarketCap(
  market: ChainMarket,
  chainId: ChainId,
  onChainSupply: number | null | undefined
): ChainMarket {
  if (onChainSupply == null || !Number.isFinite(onChainSupply) || market.usd == null) {
    return market;
  }

  if (chainId === 'vrc') {
    return {
      ...market,
      marketCap: market.usd * onChainSupply,
      circulatingSupply: onChainSupply,
    };
  }

  if (market.marketCap != null) {
    return market;
  }

  return {
    ...market,
    marketCap: market.usd * onChainSupply,
    circulatingSupply: onChainSupply,
    source: market.source === 'unavailable' ? 'computed' : market.source,
  };
}
