import type { ChainId } from '../types.js';
export declare function recordNetworkMetricSnapshot(chainId: ChainId): Promise<void>;
export declare function registerNetworkMetricSnapshots(): void;
