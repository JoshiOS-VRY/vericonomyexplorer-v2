import type { ChainId } from "../types.js";
import type { ChainMarket, HomeMarketPayload } from "../types/home.js";
declare const emptyMarket: () => ChainMarket;
export declare function fetchChainMarket(chainId: ChainId, onChainSupply?: number | null): Promise<ChainMarket>;
export declare function fetchHomeMarket(vrmSupply: number | null, vrcSupply: number | null): Promise<HomeMarketPayload>;
export { emptyMarket };
