import { EventEmitter } from "node:events";
import type { RpcClient } from "../rpc/pool.js";
import type { ChainId, TipState } from "../types.js";
export declare class TipBroker extends EventEmitter {
    readonly chainId: ChainId;
    private readonly rpc;
    private readonly pollMs;
    private readonly zmqUrl?;
    current: TipState | null;
    private pollTimer;
    private zmqAbort;
    private polling;
    constructor(chainId: ChainId, rpc: RpcClient, pollMs: number, zmqUrl?: string | undefined);
    start(): Promise<void>;
    getTip(): TipState | null;
    stop(): Promise<void>;
    private seedFromDb;
    private poll;
    private setTip;
    private startZmq;
}
