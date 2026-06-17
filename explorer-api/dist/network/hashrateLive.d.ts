import { type HashrateSource } from '@vericonomy/network-metrics';
import { type RpcCall } from './stats.js';
export type CanonicalVrmHashrate = {
    hashPerSec: number | null;
    hashrateKhPerMin: number | null;
    source: HashrateSource;
};
export type CanonicalVrmHashrateOptions = {
    /** Skip duplicate RPC when caller already fetched getmininginfo. */
    miningInfo?: unknown | null;
    /** Skip duplicate RPC when caller already fetched getblockchaininfo. */
    blockchainInfo?: unknown | null;
};
/** Canonical live VRM network hashrate (shared resolver). */
export declare function fetchCanonicalVrmHashrate(call: RpcCall, options?: CanonicalVrmHashrateOptions): Promise<CanonicalVrmHashrate>;
