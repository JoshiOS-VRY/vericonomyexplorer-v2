import type { ChainId } from '../types.js';
import type { ChainMarket, HomeMarketPayload } from '../types/home.js';
declare const emptyMarket: () => ChainMarket;
/** VRC cap is always on-chain supply × USD; VRM fills cap only when external data lacks it. */
export declare function applyOnChainMarketCap(market: ChainMarket, chainId: ChainId, onChainSupply: number | null): ChainMarket;
export declare function fetchChainMarket(chainId: ChainId, onChainSupply?: number | null): Promise<ChainMarket>;
export declare function fetchHomeMarket(vrmSupply: number | null, vrcSupply: number | null): Promise<HomeMarketPayload>;
export { emptyMarket };
