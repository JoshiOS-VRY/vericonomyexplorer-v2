import {
  meanBlockSpacingSec,
  VRM_HASHRATE_WINDOW_BLOCKS,
  VRM_POW_INTERVAL,
} from '@vericonomy/network-metrics';
import { parseRpcNumber, type RpcCall } from './stats.js';

type BlockHeader = {
  time?: unknown;
};

async function blockHeaderAtHeight(call: RpcCall, height: number): Promise<BlockHeader | null> {
  try {
    const hash = await call('getblockhash', [height], 10_000);
    if (typeof hash !== 'string' || hash.length === 0) return null;
    const header = (await call('getblockheader', [hash, true], 10_000)) as BlockHeader;
    return header ?? null;
  } catch {
    return null;
  }
}

async function meanSpacingOverWindow(
  call: RpcCall,
  tipHeight: number,
  windowBlocks: number
): Promise<number | null> {
  if (tipHeight < windowBlocks) return null;

  const startHeight = tipHeight - windowBlocks;
  const [startHeader, tipHeader] = await Promise.all([
    blockHeaderAtHeight(call, startHeight),
    blockHeaderAtHeight(call, tipHeight),
  ]);

  const startTime = parseRpcNumber(startHeader?.time);
  const tipTime = parseRpcNumber(tipHeader?.time);
  if (startTime == null || tipTime == null) return null;

  return meanBlockSpacingSec(startTime, tipTime, windowBlocks);
}

/** Measured spacing over the primary ~30 min window. */
export async function fetchRecentBlockSpacingSec(
  call: RpcCall,
  tipHeight: number
): Promise<number | null> {
  return meanSpacingOverWindow(call, tipHeight, VRM_HASHRATE_WINDOW_BLOCKS);
}

/** Measured spacing over the 72-block PoW interval window. */
export async function fetchExtendedBlockSpacingSec(
  call: RpcCall,
  tipHeight: number
): Promise<number | null> {
  return meanSpacingOverWindow(call, tipHeight, VRM_POW_INTERVAL);
}
