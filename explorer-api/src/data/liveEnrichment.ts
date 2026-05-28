import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
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

type SummaryPayload = Record<string, unknown> & {
  health?: Record<string, unknown> & {
    heights?: { maxIndexedHeight?: number | null };
  };
  latestBlocks?: unknown[];
};

type IndexerHealthPayload = Record<string, unknown> & {
  chains?: Array<Record<string, unknown> & { id?: string }>;
};

export async function enrichChainSummary(
  summary: SummaryPayload,
  chainId: ChainId,
  options: Record<string, unknown> = {},
): Promise<SummaryPayload> {
  try {
    const brokerTip = getTip(chainId);
    const skipLiveRpc = options.skipLiveRpc === true || options.skipLiveBlocks === true;
    const tip =
      brokerTip ??
      (skipLiveRpc
        ? null
        : ((await liveChain.getTip(chainId, options)) as { height: number; hash: string }));

    if (tip) {
      summary.health = health.enrichWithLiveRpc(summary.health, tip.height, options);
    }

    const indexedHeight = summary.health?.heights?.maxIndexedHeight ?? null;

    if (
      !options.skipLiveBlocks &&
      tip &&
      (indexedHeight === null || tip.height > indexedHeight)
    ) {
      summary.latestBlocks = await liveChain.getRecentBlocks(chainId, 10, options);
    }
  } catch {
    summary.health = {
      ...summary.health,
      explorerStatus: offlineStatus,
    };
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
    return (await liveChain.getBlockFromRpc(chainId, hashOrHeight, options)) as Record<
      string,
      unknown
    >;
  } catch {
    return indexed;
  }
}
