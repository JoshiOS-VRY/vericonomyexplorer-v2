'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ThemedChartTooltip } from '@/components/explorer/charts/ThemedChartTooltip';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { MinerBlockDistributionResult } from '@/lib/api/types';
import { CHART_ANIMATION } from '@/lib/chartVisuals';
import { getMinerSeriesColor } from '@/lib/minerChartColors';
import { formatHeight } from '../ExplorerUi';

function formatShare(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function MinersDistributionChart({ data }: { data: MinerBlockDistributionResult }) {
  const colors = useChartTheme();
  const tickFill = colors.fgSubtle || '#64748b';
  const chartRows = data.segments.map((segment, index) => ({
    ...segment,
    color: getMinerSeriesColor(segment.id, index),
  }));

  if (!chartRows.length || data.totalBlocks <= 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-fg-muted sm:h-80">
        No block distribution data yet.
      </div>
    );
  }

  const fromHeight = data.blockWindow?.fromHeight;
  const toHeight = data.blockWindow?.toHeight;

  return (
    <div className="miners-distribution-chart h-72 w-full min-h-[288px] sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={
              <ThemedChartTooltip
                colors={colors}
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
            cy="46%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={1.5}
            stroke={colors.bgPanel}
            strokeWidth={2}
            animationDuration={CHART_ANIMATION.duration}
          >
            {chartRows.map((segment) => (
              <Cell key={segment.id} fill={segment.color} />
            ))}
          </Pie>
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: 11, color: tickFill, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <text
            x="50%"
            y="44%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.fg}
            style={{ fontSize: 22, fontWeight: 700 }}
          >
            {data.totalBlocks.toLocaleString()}
          </text>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.fgSubtle}
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}
          >
            BLOCKS
          </text>
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">
        Last {data.blockWindow?.count?.toLocaleString() ?? '1,000'} blocks
        {fromHeight != null && toHeight != null
          ? ` · heights ${formatHeight(fromHeight)}–${formatHeight(toHeight)}`
          : null}
      </p>
    </div>
  );
}
