'use client';

import { InsightsChartPanel } from '@/components/explorer/charts/InsightsChartPanel';
import { MinersDistributionChart } from '@/components/explorer/vrm/MinersDistributionChart';
import { MinersShareTrendChart } from '@/components/explorer/vrm/MinersShareTrendChart';
import type { MinerBlockDistributionResult, MinerShareTrendResult } from '@/lib/api/types';
import { minersPeriodLabel } from '@/lib/minersPeriods';
import { cn } from '@/lib/utils';

export function VrmMinersCharts({
  shareTrend,
  distribution,
  period,
  loading = false,
}: {
  shareTrend: MinerShareTrendResult;
  distribution: MinerBlockDistributionResult;
  period: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-5 lg:grid-cols-2',
        loading && 'pointer-events-none opacity-70 transition-opacity'
      )}
    >
      <InsightsChartPanel
        chainId="vrm"
        title="Top 10 miners trend"
        loading={loading && !shareTrend.points.length}
        empty={
          !shareTrend.points.length
            ? 'Mining share trends appear once the indexer has block reward data for this period.'
            : null
        }
      >
        <MinersShareTrendChart data={shareTrend} period={period} />
      </InsightsChartPanel>

      <InsightsChartPanel
        chainId="vrm"
        title="Miner distribution"
        loading={loading && !distribution.segments.length}
        empty={
          !distribution.segments.length
            ? 'Block finder distribution will populate as recent blocks are indexed.'
            : null
        }
        footer="Past 1,000 blocks"
      >
        <MinersDistributionChart data={distribution} />
      </InsightsChartPanel>
    </div>
  );
}
