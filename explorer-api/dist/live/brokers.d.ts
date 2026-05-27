import type { ChainId, TipState } from "../types.js";
import { TipBroker } from "./tipBroker.js";
export declare function initBrokers(): Promise<void>;
export declare function stopBrokers(): Promise<void>;
export declare function getBroker(chainId: ChainId): TipBroker;
export declare function getTip(chainId: ChainId): TipState | null;
export declare function onTip(chainId: ChainId, listener: (tip: TipState) => void): () => void;
export declare function onAnyTip(listener: (chainId: ChainId, tip: TipState) => void): () => void;
