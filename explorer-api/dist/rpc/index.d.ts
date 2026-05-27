import type { ChainId } from "../types.js";
import { type RpcClient } from "./pool.js";
export declare function getRpcClient(chainId: ChainId): RpcClient;
export declare function closeAllRpcClients(): Promise<void>;
export declare function rpc(chainId: ChainId): RpcClient;
