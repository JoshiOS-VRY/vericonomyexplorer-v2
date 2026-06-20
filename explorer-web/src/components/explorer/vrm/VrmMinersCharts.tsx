'use client';

import { InsightsChartPanel } from '@/components/explorer/charts/InsightsChartPanel';
import { MinersDistributionChart } from '@/components/explorer/vrm/MinersDistributionChart';
import { MinersShareTrendChart } from '@/components/explorer/vrm/MinersShareTrendChart';
import type { MinerBlockDistributionResult, MinerShareTrendResult } from '@/lib/api/types';
import { MINERS_CHART_PANEL_MIN_HEIGHT } from '@/lib/minersChartLayout';
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
  const panelClassName = cn('flex h-full flex-col', MINERS_CHART_PANEL_MIN_HEIGHT);

  return (
    <div
      className={cn(
        'grid gap-5 lg:grid-cols-2 lg:items-stretch',
        loading && 'pointer-events-none opacity-70 transition-opacity'
      )}
    >
      <InsightsChartPanel
        chainId="vrm"
        title="Top 10 miners trend"
        className={panelClassName}
        loading={loading && !shareTrend.points.length}
        empty={
          !shareTrend.points.length
            ? 'Mining share trends appear once the indexer has block reward data for this period.'
            : null
        }
        footer={minersPeriodLabel(period)}
      >
        <MinersShareTrendChart data={shareTrend} period={period} />
      </InsightsChartPanel>

      <InsightsChartPanel
        chainId="vrm"
        title="Miner distribution"
        className={panelClassName}
        loading={loading && !distribution.segments.length}
        empty={
          !distribution.segments.length
            ? 'Block finder distribution will populate as recent blocks are indexed.'
            : null
        }
        footer={minersPeriodLabel(period)}
      >
        <MinersDistributionChart data={distribution} period={period} />
      </InsightsChartPanel>
    </div>
  );
}
