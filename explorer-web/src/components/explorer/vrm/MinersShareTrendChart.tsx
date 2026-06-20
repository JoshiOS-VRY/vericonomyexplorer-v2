'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ThemedChartTooltip,
  type RechartsTooltipContentProps,
} from '@/components/explorer/charts/ThemedChartTooltip';
import { chartGridProps, chartXAxisProps } from '@/components/explorer/charts/chartAxis';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { MinerShareTrendResult } from '@/lib/api/types';
import { CHART_ANIMATION, CHART_MARGINS } from '@/lib/chartVisuals';
import { getMinerSeriesColor } from '@/lib/minerChartColors';
import { minersPeriodLabel } from '@/lib/minersPeriods';

function formatShare(value: number): string {
  return `${value.toFixed(1)}%`;
}

function MinersShareTrendTooltip({
  active,
  payload,
  label,
  colors,
}: RechartsTooltipContentProps & { colors: ReturnType<typeof useChartTheme> }) {
  const row = payload?.[0]?.payload as { totalBlocks?: number } | undefined;
  const totalBlocks = row?.totalBlocks ?? 0;
  const visiblePayload = payload?.filter(
    (item) => typeof item.value === 'number' && Number(item.value) > 0
  );

  return (
    <ThemedChartTooltip
      active={active}
      payload={visiblePayload}
      label={label}
      colors={colors}
      surface="light"
      valueFormatter={(value) => {
        if (totalBlocks <= 0) {
          return formatShare(0);
        }
        return formatShare((Number(value) / totalBlocks) * 100);
      }}
    />
  );
}

export function MinersShareTrendChart({
  data,
  period,
}: {
  data: MinerShareTrendResult;
  period: string;
}) {
  const colors = useChartTheme();
  const grid = chartGridProps(colors);
  const xAxis = chartXAxisProps(colors);
  const tickFill = colors.fgSubtle || '#64748b';

  if (!data.points.length || !data.series.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-fg-muted sm:h-80">
        No share trend data for this period yet.
      </div>
    );
  }

  return (
    <div className="miners-share-trend-chart h-72 w-full min-h-[288px] sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.points} margin={CHART_MARGINS} stackOffset="expand">
          <defs>
            {data.series.map((series, index) => {
              const fill = getMinerSeriesColor(series.id, index);
              return (
                <linearGradient
                  key={series.id}
                  id={`miner-share-${series.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={fill} stopOpacity={0.82} />
                  <stop offset="100%" stopColor={fill} stopOpacity={0.38} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid {...grid} />
          <XAxis {...xAxis} interval="preserveStartEnd" minTickGap={28} />
          <YAxis
            width={44}
            tick={{ fill: tickFill, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
          />
          <Tooltip content={<MinersShareTrendTooltip colors={colors} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: tickFill, paddingTop: 10 }}
            iconType="circle"
            iconSize={8}
          />
          {data.series.map((series, index) => {
            const stroke = getMinerSeriesColor(series.id, index);
            return (
              <Area
                key={series.id}
                type="monotone"
                dataKey={series.id}
                name={series.label}
                stackId="share"
                stroke={stroke}
                fill={`url(#miner-share-${series.id})`}
                strokeWidth={1.25}
                animationDuration={CHART_ANIMATION.duration}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
        {minersPeriodLabel(period)} · share of blocks found · top{' '}
        {data.series.filter((series) => series.id !== '__others__').length} miners
      </p>
    </div>
  );
}
