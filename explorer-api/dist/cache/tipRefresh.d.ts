import type { ChainId } from '../types.js';
type ChainRefreshHandler = (chainId: ChainId) => Promise<void>;
export declare function registerChainTipRefresh(handler: ChainRefreshHandler): void;
export declare function registerGlobalTipRefresh(key: string, refresh: () => Promise<void>): void;
export declare function refreshOnTip(chainId: ChainId): void;
export {};
