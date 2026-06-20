'use client';

import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ThemedChartTooltip } from '@/components/explorer/charts/ThemedChartTooltip';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { MinerBlockDistributionResult } from '@/lib/api/types';
import { CHART_ANIMATION } from '@/lib/chartVisuals';
import { getMinerSeriesColor } from '@/lib/minerChartColors';
import { MINERS_CHART_BODY_HEIGHT } from '@/lib/minersChartLayout';
import { cn } from '@/lib/utils';

function formatShare(value: number): string {
  return `${value.toFixed(1)}%`;
}

type ChartRow = MinerBlockDistributionResult['segments'][number] & { color: string };

export function MinersDistributionChart({
  data,
  period: _period,
}: {
  data: MinerBlockDistributionResult;
  period: string;
}) {
  const colors = useChartTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartRows = useMemo<ChartRow[]>(
    () =>
      data.segments.map((segment, index) => ({
        ...segment,
        color: getMinerSeriesColor(segment.id, index),
      })),
    [data.segments]
  );

  if (!chartRows.length || data.totalBlocks <= 0) {
    return (
      <div
        className={cn(
          MINERS_CHART_BODY_HEIGHT,
          'flex items-center justify-center text-sm text-fg-muted'
        )}
      >
        No block distribution data for this period yet.
      </div>
    );
  }

  const highlightedIndex = activeIndex ?? 0;
  const highlighted = chartRows[highlightedIndex];
  const topMinerCount = chartRows.filter((row) => row.id !== '__others__').length;

  return (
    <div className={cn('miners-distribution-chart flex h-full flex-col', MINERS_CHART_BODY_HEIGHT)}>
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <div className="relative mx-auto w-full max-w-[9.5rem] shrink-0 sm:mx-0">
          <div
            className="pointer-events-none absolute inset-4 rounded-full opacity-60 blur-2xl"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${highlighted.color} 35%, transparent) 0%, transparent 70%)`,
            }}
          />
          <div className="relative aspect-square w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {chartRows.map((segment) => (
                    <linearGradient
                      key={`grad-${segment.id}`}
                      id={`miner-dist-${segment.id}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={segment.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={segment.color} stopOpacity={0.72} />
                    </linearGradient>
                  ))}
                </defs>
                <Tooltip
                  content={
                    <ThemedChartTooltip
                      colors={colors}
                      surface="light"
                      valueFormatter={(value, name) => {
                        const segment = chartRows.find((row) => row.label === name);
                        const blocks = segment?.blocks ?? Number(value);
                        const share = segment?.sharePct ?? 0;
                        return `${formatShare(share)} · ${blocks.toLocaleString()} blocks`;
                      }}
                    />
                  }
                />
                <Pie
                  data={chartRows}
                  dataKey="blocks"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke={colors.bgPanel}
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  animationDuration={CHART_ANIMATION.duration}
                >
                  {chartRows.map((segment, index) => (
                    <Cell
                      key={segment.id}
                      fill={`url(#miner-dist-${segment.id})`}
                      opacity={activeIndex == null || activeIndex === index ? 1 : 0.38}
                      stroke={activeIndex === index ? segment.color : colors.bgPanel}
                      strokeWidth={activeIndex === index ? 3 : 2}
                    />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.fg}
                  style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  {data.totalBlocks.toLocaleString()}
                </text>
                <text
                  x="50%"
                  y="56%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.fgSubtle}
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}
                >
                  BLOCKS
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ul className="min-h-0 space-y-1.5 overflow-y-auto pr-1 sm:max-h-full">
          {chartRows.map((segment, index) => {
            const isActive = highlightedIndex === index;
            return (
              <li
                key={segment.id}
                className={cn(
                  'rounded-md border px-2.5 py-2 transition-all duration-200',
                  isActive
                    ? 'border-border/80 bg-bg-subtle/80 shadow-sm'
                    : 'border-transparent bg-transparent hover:border-border/50 hover:bg-bg-subtle/40'
                )}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-fg">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: segment.color,
                        boxShadow: isActive
                          ? `0 0 8px color-mix(in srgb, ${segment.color} 50%, transparent)`
                          : undefined,
                      }}
                    />
                    <span className="truncate">{segment.label}</span>
                  </span>
                  <span className="shrink-0 text-right leading-tight">
                    <span className="block text-xs font-bold tabular-nums text-fg">
                      {formatShare(segment.sharePct)}
                    </span>
                    <span className="text-[10px] font-medium tabular-nums text-fg-subtle">
                      {segment.blocks.toLocaleString()} blk
                    </span>
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(segment.sharePct, 0.5)}%`,
                      background: `linear-gradient(90deg, ${segment.color}, color-mix(in srgb, ${segment.color} 70%, white))`,
                      opacity: isActive ? 1 : 0.85,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-fg-subtle">
        Share of blocks found · top {topMinerCount} miners · one block counted once
      </p>
    </div>
  );
}
