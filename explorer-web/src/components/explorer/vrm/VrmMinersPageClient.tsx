'use client';

import Link from 'next/link';
import { VrmAddressLink } from '@/components/explorer/address/VrmAddressLink';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { DataTable, PaginationLinks, formatHeight } from '@/components/explorer/ExplorerUi';
import { MinersPeriodPicker } from '@/components/explorer/vrm/MinersPeriodPicker';
import { VrmMinersCharts } from '@/components/explorer/vrm/VrmMinersCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  fetchMinerBlockDistributionClient,
  fetchMinersLeaderboardClient,
  fetchMinerShareTrendClient,
} from '@/lib/api/client';
import type {
  MinerBlockDistributionResult,
  MinersLeaderboardResult,
  MinerShareTrendResult,
} from '@/lib/api/types';
import { normalizeMinersPeriod, type MinersPeriodId } from '@/lib/minersPeriods';
import { cn } from '@/lib/utils';

export function VrmMinersPageClient({
  initialMiners,
  initialShareTrend,
  initialDistribution,
  initialPeriod,
  limit,
  offset,
}: {
  initialMiners: MinersLeaderboardResult;
  initialShareTrend: MinerShareTrendResult;
  initialDistribution: MinerBlockDistributionResult;
  initialPeriod: MinersPeriodId;
  limit: number;
  offset: number;
}) {
  const router = useRouter();
  const [miners, setMiners] = useState(initialMiners);
  const [shareTrend, setShareTrend] = useState(initialShareTrend);
  const [distribution, setDistribution] = useState(initialDistribution);
  const [period, setPeriod] = useState<MinersPeriodId>(normalizeMinersPeriod(initialPeriod));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(
    async (nextPeriod: MinersPeriodId) => {
      if (nextPeriod === period || loading) {
        return;
      }

      setLoading(true);
      setError(null);
      setPeriod(nextPeriod);

      const params = new URLSearchParams({ period: nextPeriod });
      if (limit !== 50) {
        params.set('limit', String(limit));
      }
      router.replace(`/vrm/miners?${params.toString()}`, { scroll: false });

      try {
        const [minersResult, shareTrendResult, distributionResult] = await Promise.allSettled([
          fetchMinersLeaderboardClient('vrm', {
            period: nextPeriod,
            limit,
            offset: 0,
          }),
          fetchMinerShareTrendClient('vrm', { period: nextPeriod, top: 10 }),
          fetchMinerBlockDistributionClient('vrm', { period: nextPeriod, top: 9 }),
        ]);
        if (minersResult.status !== 'fulfilled') {
          throw new Error('miners leaderboard failed');
        }
        setMiners(minersResult.value);
        setShareTrend(
          shareTrendResult.status === 'fulfilled'
            ? shareTrendResult.value
            : { chainId: 'vrm', trusted: false, source: minersResult.value.source, series: [], points: [] }
        );
        setDistribution(
          distributionResult.status === 'fulfilled'
            ? distributionResult.value
            : {
                chainId: 'vrm',
                trusted: false,
                source: minersResult.value.source,
                totalBlocks: 0,
                segments: [],
              }
        );
      } catch {
        setError('Unable to load miners for this period.');
      } finally {
        setLoading(false);
      }
    },
    [limit, loading, period, router]
  );

  return (
    <>
      <MinersPeriodPicker
        period={period}
        loading={loading}
        onSelect={(next) => void loadPeriod(next)}
      />

      <VrmMinersCharts
        shareTrend={shareTrend}
        distribution={distribution}
        period={period}
        loading={loading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Mined VRM</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {loading && miners.items.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-sm text-fg-muted">
              Loading miners…
            </div>
          ) : miners.items.length === 0 ? (
            <p className="py-8 text-sm text-fg-muted">
              {period === 'all'
                ? 'No mining rewards recorded yet.'
                : 'No mining rewards recorded for this period. Recent blocks appear here as the indexer catches up to the chain tip.'}
            </p>
          ) : (
            <div className={cn(loading && 'pointer-events-none opacity-60')}>
              <DataTable
                headers={['Rank', 'Address', 'Mined', 'Blocks', 'Last block']}
                rows={miners.items.map((item) => [
                  `#${item.rank}`,
                  <VrmAddressLink
                    key="a"
                    address={item.address}
                    showFullAddress
                    className="text-xs"
                  />,
                  `${item.mined.amount} ${item.mined.ticker}`,
                  formatHeight(item.blockCount),
                  item.lastMinedHeight != null ? (
                    <Link key="lb" href={`/vrm/block/${item.lastMinedHeight}`}>
                      {formatHeight(item.lastMinedHeight)}
                    </Link>
                  ) : (
                    'N/A'
                  ),
                ])}
              />
            </div>
          )}
          <PaginationLinks
            basePath="/vrm/miners"
            paging={miners.paging ?? { limit, offset, total: 0, hasMore: false }}
            extraParams={{ period }}
          />
        </CardContent>
      </Card>
    </>
  );
}
