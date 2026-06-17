import {
  resolveNetworkHashPerSec,
  type HashrateSource,
  type MiningInfoLike,
} from '@vericonomy/network-metrics';
import { parseRpcNumber, type RpcCall } from './stats.js';
import { fetchExtendedBlockSpacingSec, fetchRecentBlockSpacingSec } from './recentSpacing.js';

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
export async function fetchCanonicalVrmHashrate(
  call: RpcCall,
  options: CanonicalVrmHashrateOptions = {}
): Promise<CanonicalVrmHashrate> {
  const miningInfoPromise =
    options.miningInfo !== undefined
      ? Promise.resolve(options.miningInfo)
      : call('getmininginfo').catch(() => null);

  const blockchainInfoPromise =
    options.blockchainInfo !== undefined
      ? Promise.resolve(options.blockchainInfo)
      : call('getblockchaininfo').catch(() => null);

  const [miningInfoResult, blockchainInfoResult] = await Promise.allSettled([
    miningInfoPromise,
    blockchainInfoPromise,
  ]);

  const miningRaw =
    miningInfoResult.status === 'fulfilled'
      ? (miningInfoResult.value as Record<string, unknown> | null)
      : null;

  const blockchainInfo =
    blockchainInfoResult.status === 'fulfilled'
      ? (blockchainInfoResult.value as { blocks?: unknown; difficulty?: unknown })
      : null;

  const difficulty = parseRpcNumber(blockchainInfo?.difficulty);
  const tipHeight = parseRpcNumber(blockchainInfo?.blocks);
  const blocksPerHour = parseRpcNumber(miningRaw?.blocksperhour);

  const miningInfo: MiningInfoLike | null = miningRaw
    ? {
        networkhashps: parseRpcNumber(miningRaw.networkhashps) ?? undefined,
        nethashrate:
          parseRpcNumber(miningRaw.nethashrate) ??
          parseRpcNumber(miningRaw['nethashrate (kH/m)']) ??
          undefined,
        blocksperhour: blocksPerHour ?? undefined,
        ...miningRaw,
      }
    : null;

  let recentSpacingSec: number | null = null;
  let extendedSpacingSec: number | null = null;

  if (tipHeight != null) {
    [recentSpacingSec, extendedSpacingSec] = await Promise.all([
      fetchRecentBlockSpacingSec(call, tipHeight),
      fetchExtendedBlockSpacingSec(call, tipHeight),
    ]);
  }

  return resolveNetworkHashPerSec({
    miningInfo,
    difficulty,
    recentSpacingSec,
    extendedSpacingSec,
    blocksPerHour,
  });
}
