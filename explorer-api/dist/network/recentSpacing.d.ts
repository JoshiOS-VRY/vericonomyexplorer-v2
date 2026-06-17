import { type RpcCall } from './stats.js';
/** Measured spacing over the primary ~1 hour window. */
export declare function fetchRecentBlockSpacingSec(call: RpcCall, tipHeight: number): Promise<number | null>;
/** Measured spacing over the 72-block PoW interval window. */
export declare function fetchExtendedBlockSpacingSec(call: RpcCall, tipHeight: number): Promise<number | null>;
