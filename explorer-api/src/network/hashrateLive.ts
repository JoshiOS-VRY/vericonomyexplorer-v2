import {
  resolveNetworkHashPerSec,
  VRM_BLOCKS_7_DAYS,
  VRM_BLOCKS_PER_DAY,
  type HashrateSource,
} from '@vericonomy/network-metrics';
import { parseRpcNumber, type RpcCall } from './stats.js';

export type CanonicalVrmHashrate = {
  hashPerSec: number | null;
  hashrateKhPerMin: number | null;
  source: HashrateSource;
};

async function safeNetworkHashrate(rpcCall: RpcCall, blockCount: number): Promise<number | null> {
  try {
    const hashrate = await rpcCall('getnetworkhashps', [blockCount], 15_000);
    if (typeof hashrate === 'number' && hashrate > 0) {
      return hashrate;
    }
  } catch {
    /* unsupported or timeout */
  }
  return null;
}

export type CanonicalVrmHashrateOptions = {
  include7d?: boolean;
  /** Skip duplicate RPC when caller already fetched getmininginfo. */
  miningInfo?: unknown | null;
  /** Skip duplicate RPC when caller already fetched getblockchaininfo. */
  blockchainInfo?: unknown | null;
};

/** Canonical live VRM network hashrate (shared resolver). */
export async function fetchCanonicalVrmHashrate(
  call: RpcCall,
  options: CanonicalVrmHashrateOptions = {}
): Promise<CanonicalVrmHashrate> {
  const include7d = options.include7d ?? false;

  const miningInfoPromise =
    options.miningInfo !== undefined
      ? Promise.resolve(options.miningInfo)
      : call('getmininginfo').catch(() => null);

  const blockchainInfoPromise =
    options.blockchainInfo !== undefined
      ? Promise.resolve(options.blockchainInfo)
      : call('getblockchaininfo').catch(() => null);

  const [miningInfoResult, hashrate1dResult, blockchainInfoResult, hashrate7dResult] =
    await Promise.allSettled([
      miningInfoPromise,
      safeNetworkHashrate(call, VRM_BLOCKS_PER_DAY),
      blockchainInfoPromise,
      include7d ? safeNetworkHashrate(call, VRM_BLOCKS_7_DAYS) : Promise.resolve(null),
    ]);

  const miningInfo =
    miningInfoResult.status === 'fulfilled'
      ? (miningInfoResult.value as {
          networkhashps?: number;
          nethashrate?: number;
        })
      : null;

  const hashrate1d = hashrate1dResult.status === 'fulfilled' ? hashrate1dResult.value : null;

  const hashrate7d = hashrate7dResult.status === 'fulfilled' ? hashrate7dResult.value : null;

  const difficulty =
    blockchainInfoResult.status === 'fulfilled'
      ? parseRpcNumber((blockchainInfoResult.value as { difficulty?: unknown } | null)?.difficulty)
      : null;

  return resolveNetworkHashPerSec({
    miningInfo,
    hashrate1d,
    hashrate7d: include7d ? hashrate7d : null,
    difficulty,
  });
}
