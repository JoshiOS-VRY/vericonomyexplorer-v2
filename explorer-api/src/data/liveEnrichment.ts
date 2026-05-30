import { createRequire } from "node:module";
import { runIndexerQuery } from "../db/queryPool.js";
import { repoRoot, getSummaryLiveBlockLimit } from "../env.js";
import { getTip } from "../live/brokers.js";
import type { ChainId } from "../types.js";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const health = require(`${repoRoot}/app/indexerV2/health.js`);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const liveChain = require(`${repoRoot}/app/indexerV2/liveChain.js`);

const offlineStatus = {
  label: "Offline",
  message: "Unable to reach the chain node.",
  syncing: false,
};

type BlockRecord = Record<string, unknown> & {
  height?: number;
  hash?: string;
  time?: number | null;
  extractedBy?: string | null;
  extractedByAddress?: string | null;
  outputCount?: number | null;
  interestRatePercent?: number | null;
};

type SummaryPayload = Record<string, unknown> & {
  health?: Record<string, unknown> & {
    heights?: {
      maxIndexedHeight?: number | null;
      blocksBehind?: number | null;
    };
  };
  latestBlocks?: unknown[];
};

type IndexerHealthPayload = Record<string, unknown> & {
  chains?: Array<Record<string, unknown> & { id?: string }>;
};

function getLatestBlockHeight(latestBlocks: unknown): number | null {
  if (!Array.isArray(latestBlocks) || latestBlocks.length === 0) {
    return null;
  }

  const height = (latestBlocks[0] as { height?: number }).height;
  return height == null || Number.isNaN(Number(height)) ? null : Number(height);
}

function shouldFetchLiveBlocks(
  tip: { height: number },
  _indexedHeight: number | null,
  latestBlockHeight: number | null,
  options: Record<string, unknown>,
): boolean {
  if (options.skipLiveBlocks === true) {
    return false;
  }

  if (latestBlockHeight === null) {
    return true;
  }

  return tip.height > latestBlockHeight;
}

function computeLiveBlockCount(
  tipHeight: number,
  indexedHeight: number | null,
  latestBlockHeight: number | null,
  maxCount: number,
): number {
  if (indexedHeight != null && tipHeight > indexedHeight) {
    return Math.min(maxCount, Math.max(1, tipHeight - indexedHeight + 1));
  }

  if (latestBlockHeight != null && tipHeight > latestBlockHeight) {
    return Math.min(maxCount, Math.max(1, tipHeight - latestBlockHeight + 1));
  }

  return maxCount;
}

function mergeLatestBlocksWithRpc(
  indexedBlocks: BlockRecord[],
  rpcBlocks: BlockRecord[],
  maxCount = 10,
): BlockRecord[] {
  const byHeight = new Map<number, BlockRecord>();

  for (const block of indexedBlocks) {
    if (block.height != null) {
      byHeight.set(Number(block.height), block);
    }
  }

  for (const block of rpcBlocks) {
    const height = Number(block.height);
    const indexed = byHeight.get(height);
    byHeight.set(
      height,
      indexed
        ? {
            ...block,
            extractedBy: block.extractedBy ?? indexed.extractedBy ?? null,
            extractedByAddress:
              block.extractedByAddress ?? indexed.extractedByAddress ?? null,
            outputCount: block.outputCount ?? indexed.outputCount ?? null,
          }
        : block,
    );
  }

  return [...byHeight.values()]
    .sort((a, b) => Number(b.height) - Number(a.height))
    .slice(0, maxCount);
}

async function resolveTip(
  chainId: ChainId,
  options: Record<string, unknown>,
): Promise<{ height: number; hash: string } | null> {
  const skipLiveRpc = options.skipLiveRpc === true || options.skipLiveBlocks === true;
  const brokerTip = getTip(chainId);
  if (brokerTip) {
    return brokerTip;
  }

  if (skipLiveRpc) {
    return null;
  }

  return (await liveChain.getTip(chainId, options)) as { height: number; hash: string };
}

async function enrichVrcBlockInterestRates(
  blocks: BlockRecord[],
  chainId: ChainId,
  options: Record<string, unknown>,
): Promise<BlockRecord[]> {
  if (chainId !== "vrc" || blocks.length === 0) {
    return blocks;
  }

  if (blocks.every((block) => block.interestRatePercent != null)) {
    return blocks;
  }

  try {
    return (await runIndexerQuery<BlockRecord[]>(
      "enrichBlockInterestRatesIndexed",
      [chainId, blocks],
      options,
    )) as BlockRecord[];
  } catch {
    return blocks;
  }
}

export async function enrichLatestBlocksLive(
  latestBlocks: unknown,
  chainId: ChainId,
  summaryHealth: SummaryPayload["health"],
  options: Record<string, unknown> = {},
): Promise<BlockRecord[]> {
  const indexedBlocks = Array.isArray(latestBlocks)
    ? (latestBlocks.filter(
        (block): block is BlockRecord => block != null && typeof block === "object",
      ) as BlockRecord[])
    : [];

  try {
    const tip = await resolveTip(chainId, options);
    if (!tip) {
      return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
    }

    const indexedHeight = summaryHealth?.heights?.maxIndexedHeight ?? null;
    const latestBlockHeight = getLatestBlockHeight(indexedBlocks);

    if (!shouldFetchLiveBlocks(tip, indexedHeight, latestBlockHeight, options)) {
      return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
    }

    const maxCount = getSummaryLiveBlockLimit();
    const count = computeLiveBlockCount(tip.height, indexedHeight, latestBlockHeight, maxCount);
    const fromHeight =
      indexedHeight != null && tip.height > indexedHeight ? indexedHeight + 1 : undefined;

    const rpcBlocks = (await liveChain.enrichBlockMiners(
      chainId,
      (await liveChain.getRecentBlocks(chainId, count, {
        ...options,
        tipHeight: tip.height,
        fromHeight,
        blockVerbosity: 1,
      })) as BlockRecord[],
      options,
    )) as BlockRecord[];

    const merged = mergeLatestBlocksWithRpc(indexedBlocks, rpcBlocks, maxCount);
    return enrichVrcBlockInterestRates(merged, chainId, options);
  } catch {
    return enrichVrcBlockInterestRates(indexedBlocks, chainId, options);
  }
}

export async function enrichChainSummary(
  summary: SummaryPayload,
  chainId: ChainId,
  options: Record<string, unknown> = {},
): Promise<SummaryPayload> {
  try {
    const tip = await resolveTip(chainId, options);

    if (tip) {
      summary.health = health.enrichWithLiveRpc(summary.health, tip.height, options);
    }
  } catch {
    /* keep indexed health when live tip lookup fails */
  }

  try {
    summary.latestBlocks = await enrichLatestBlocksLive(
      summary.latestBlocks,
      chainId,
      summary.health,
      options,
    );
  } catch {
    /* block enrichment failure should not mark the chain offline */
  }

  return summary;
}

export async function enrichIndexerHealth(
  baseHealth: IndexerHealthPayload,
  options: Record<string, unknown> = {},
): Promise<IndexerHealthPayload> {
  const chains = await Promise.all(
    (baseHealth.chains ?? []).map(async (chainHealth) => {
      try {
        const chainId = chainHealth.id as ChainId;
        const tip = await liveChain.getTip(chainId, options);
        return health.enrichWithLiveRpc(chainHealth, tip.height, options);
      } catch {
        return {
          ...chainHealth,
          explorerStatus: offlineStatus,
        };
      }
    }),
  );

  return { ...baseHealth, chains };
}

export async function fetchBlockWithRpcFallback(
  chainId: ChainId,
  hashOrHeight: string,
  indexed: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (indexed.found) {
    return indexed;
  }

  try {
    const rpc = (await liveChain.getBlockFromRpc(chainId, hashOrHeight, options)) as Record<
      string,
      unknown
    >;

    if (!rpc.found) {
      return rpc;
    }

    return rpc;
  } catch {
    return indexed;
  }
}

export async function fetchTransactionWithRpcFallback(
  chainId: ChainId,
  txid: string,
  indexed: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (indexed.found) {
    return indexed;
  }

  try {
    const rpc = (await liveChain.getTransactionFromRpc(chainId, txid, options)) as Record<
      string,
      unknown
    >;

    return rpc.found ? rpc : indexed;
  } catch {
    return indexed;
  }
}

export async function fetchAddressWithRpcFallback(
  chainId: ChainId,
  address: string,
  indexed: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (indexed.found) {
    return indexed;
  }

  try {
    const rpc = (await liveChain.getAddressFromRpc(chainId, address, options)) as Record<
      string,
      unknown
    >;

    return rpc.found ? rpc : indexed;
  } catch {
    return indexed;
  }
}
