import path from 'node:path';
import { createRequire } from 'node:module';
import { repoRoot } from '../env.js';
import { getAddressCount, getWritableDb } from '../data/writableDb.js';
import { fetchVrcNetworkStats, fetchVrmNetworkStats } from '../network/index.js';
import type { ChainId } from '../types.js';

const requireRoot = createRequire(path.join(repoRoot, 'package.json'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const networkMetrics = requireRoot('./app/indexerV2/networkMetrics.js') as {
  upsertNetworkMetricBucket: (
    db: unknown,
    chainId: string,
    metrics: Record<string, unknown>
  ) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supplyHistory = requireRoot('./app/indexerV2/supplyHistory.js') as {
  indexedSupplyAtHeight: (db: unknown, chainId: string, height: number) => Promise<number | null>;
};

async function safeIndexedSupply(
  db: unknown,
  chainId: ChainId,
  height: number | null
): Promise<number | null> {
  if (height == null) {
    return null;
  }
  try {
    return await supplyHistory.indexedSupplyAtHeight(db, chainId, height);
  } catch {
    // Heavy supply-series build can exceed statement timeout (esp. VRC); the
    // RPC-derived supply is used as the fallback for the bucket.
    return null;
  }
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const periodStats = requireRoot('./app/indexerV2/periodStats.js') as {
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

  const addressCount = await getAddressCount(chainId);
  const db = getWritableDb();

  if (chainId === 'vrm') {
    const stats = await fetchVrmNetworkStats();
    const indexedSupply = await safeIndexedSupply(db, chainId, stats.blocks);
    await networkMetrics.upsertNetworkMetricBucket(db, chainId, {
      bucketStart,
      difficulty: stats.difficulty,
      blockHeight: stats.blocks,
      supply: indexedSupply ?? stats.supply,
      hashrateKhPerMin: stats.hashrateKhPerMin,
      addressCount,
    });
  } else {
    const stats = await fetchVrcNetworkStats();
    const indexedSupply = await safeIndexedSupply(db, chainId, stats.blocks);
    await networkMetrics.upsertNetworkMetricBucket(db, chainId, {
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
  void import('../cache/tipRefresh.js').then(({ registerChainTipRefresh }) => {
    registerChainTipRefresh(async (chainId) => {
      await recordNetworkMetricSnapshot(chainId).catch(() => undefined);
    });
  });
}
