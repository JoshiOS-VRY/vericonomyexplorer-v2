import path from "node:path";
import { createRequire } from "node:module";
import { repoRoot } from "../env.js";
import { getAddressCount, getWritableDb } from "../data/writableDb.js";
import { fetchVrcNetworkStats, fetchVrmNetworkStats } from "../network/index.js";
import type { ChainId } from "../types.js";

const requireRoot = createRequire(path.join(repoRoot, "package.json"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const networkMetrics = requireRoot("./app/indexerV2/networkMetrics.js") as {
  upsertNetworkMetricBucket: (
    db: unknown,
    chainId: string,
    metrics: Record<string, unknown>,
  ) => void;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supplyHistory = requireRoot("./app/indexerV2/supplyHistory.js") as {
  indexedSupplyAtHeight: (
    db: unknown,
    chainId: string,
    height: number,
  ) => number | null;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const periodStats = requireRoot("./app/indexerV2/periodStats.js") as {
  hourBucketStart: (time: number) => number;
};

const lastRecordedBucket = new Map<string, number>();

export async function recordNetworkMetricSnapshot(chainId: ChainId): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucketStart = periodStats.hourBucketStart(now);
  const key = `${chainId}:${bucketStart}`;

  if (lastRecordedBucket.get(key)) {
    return;
  }

  const addressCount = getAddressCount(chainId);
  const db = getWritableDb();

  if (chainId === "vrm") {
    const stats = await fetchVrmNetworkStats();
    const indexedSupply =
      stats.blocks != null
        ? supplyHistory.indexedSupplyAtHeight(db, chainId, stats.blocks)
        : null;
    networkMetrics.upsertNetworkMetricBucket(db, chainId, {
      bucketStart,
      difficulty: stats.difficulty,
      blockHeight: stats.blocks,
      supply: indexedSupply ?? stats.supply,
      hashrateKhPerMin: stats.hashrateKhPerMin,
      addressCount,
    });
  } else {
    const stats = await fetchVrcNetworkStats();
    const indexedSupply =
      stats.blocks != null
        ? supplyHistory.indexedSupplyAtHeight(db, chainId, stats.blocks)
        : null;
    networkMetrics.upsertNetworkMetricBucket(db, chainId, {
      bucketStart,
      difficulty: stats.difficulty,
      blockHeight: stats.blocks,
      supply: indexedSupply ?? stats.supply,
      interestRatePercent: stats.interestRatePercent,
      netStakeWeight: stats.netStakeWeight,
      percentStaked: stats.percentStaked,
      expectedStakeTimeSeconds: stats.expectedStakeTimeSeconds,
      addressCount,
    });
  }

  lastRecordedBucket.set(key, Date.now());
}

export function registerNetworkMetricSnapshots(): void {
  // Import lazily to avoid circular deps at module load.
  void import("../cache/tipRefresh.js").then(({ registerChainTipRefresh }) => {
    registerChainTipRefresh(async (chainId) => {
      await recordNetworkMetricSnapshot(chainId).catch(() => undefined);
    });
  });
}
