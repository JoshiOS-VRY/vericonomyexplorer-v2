'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RechartsTooltipContentProps } from '@/components/explorer/charts/ThemedChartTooltip';
import { niceYAxisProps } from '@/components/explorer/charts/chartAxis';
import type { ChartThemeColors } from '@/hooks/useChartTheme';
import type { AddressBalanceHistoryPeriodId } from '@/lib/api/types';
import { CHART_ANIMATION, CHART_MARGINS, formatCompactAxisValue } from '@/lib/chartVisuals';

export type AddressActivityChartRow = {
  bucketKey: string;
  axisLabel: string;
  startTime: number;
  endTime: number;
  ticker: string;
  mined: number;
  staked: number;
  received: number;
  spent: number;
  netChange: number;
  balanceAtEnd: number | null;
};

const VRM_SERIES = [
  { key: 'mined' as const, name: 'Mined', colorKey: 'success' as const },
  { key: 'received' as const, name: 'Received', colorKey: 'accent' as const },
  { key: 'spent' as const, name: 'Spent', colorKey: 'danger' as const },
] as const;

/** Overlay line — must not reuse bar series colors (Received uses accent). */
function balanceSeriesColor(colors: ChartThemeColors): string {
  return colors.fg || '#e2e8f0';
}

function categoryFill(colors: ChartThemeColors, colorKey: keyof ChartThemeColors): string {
  return colors[colorKey] || '#418bca';
}

function formatSignedAxisValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return formatCompactAxisValue(value);
}

function yAxisTitleLabel(
  title: string,
  colors: ChartThemeColors,
  side: 'left' | 'right'
): {
  value: string;
  angle: number;
  position: 'insideLeft' | 'insideRight';
  fill: string;
  fontSize: number;
  fontWeight: number;
  dx: number;
} {
  return {
    value: title,
    angle: side === 'left' ? -90 : 90,
    position: side === 'left' ? 'insideLeft' : 'insideRight',
    fill: side === 'right' ? balanceSeriesColor(colors) : colors.fgSubtle || '#64748b',
    fontSize: 11,
    fontWeight: 600,
    dx: side === 'left' ? -10 : 10,
  };
}

function formatAmount(value: number, ticker: string): string {
  return `${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${ticker}`;
}

function AddressActivityTooltip({
  active,
  payload,
  colors,
  chainId,
}: RechartsTooltipContentProps & {
  colors: ChartThemeColors;
  chainId: 'vrm' | 'vrc';
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as AddressActivityChartRow | undefined;
  if (!row) {
    return null;
  }

  const ticker = row.ticker ?? (chainId === 'vrc' ? 'VRC' : 'VRM');
  const flowEntries =
    chainId === 'vrc'
      ? row.staked > 0
        ? [{ name: 'Staked', value: row.staked }]
        : []
      : VRM_SERIES.map((series) => ({
          name: series.name,
          value: series.key === 'spent' ? Math.abs(row.spent) : row[series.key],
        })).filter((item) => item.value > 0);

  return (
    <div
      className="min-w-[11rem] rounded-lg border bg-white px-3.5 py-2.5 shadow-xl"
      style={{ borderColor: colors.border, color: '#0f172a' }}
    >
      <p className="text-xs font-semibold text-slate-900">{row.axisLabel}</p>
      {flowEntries.length ? (
        <ul className="mt-2 space-y-1">
          {flowEntries.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-slate-600">{item.name}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {item.name === 'Spent' ? '−' : '+'}
                {formatAmount(item.value, ticker)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium text-slate-600">Net change</span>
          <span
            className="font-semibold tabular-nums"
            style={{ color: row.netChange >= 0 ? colors.success : colors.danger }}
          >
            {row.netChange >= 0 ? '+' : '−'}
            {formatAmount(row.netChange, ticker)}
          </span>
        </div>
        {row.balanceAtEnd != null ? (
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-slate-600">Balance</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatAmount(row.balanceAtEnd, ticker)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function balanceAtBucketEnd(
  points: { time: number; balanceAmount: number }[],
  endTime: number
): number | null {
  if (!points.length) {
    return null;
  }

  let balance = points[0]?.balanceAmount ?? null;
  for (const point of points) {
    if (point.time <= endTime) {
      balance = point.balanceAmount;
    } else {
      break;
    }
  }

  return balance;
}

export function AddressActivityChart({
  chainId,
  chartData,
  colors,
  period,
}: {
  chainId: 'vrm' | 'vrc';
  chartData: AddressActivityChartRow[];
  colors: ChartThemeColors;
  period: AddressBalanceHistoryPeriodId;
}) {
  const tickFill = colors.fgSubtle || '#64748b';
  const flowValues = chartData.flatMap((row) => {
    if (chainId === 'vrc') {
      return [row.staked];
    }
    const positiveStack = row.mined + row.received;
    return [positiveStack, row.spent, row.netChange];
  });
  const balanceValues = chartData
    .map((row) => row.balanceAtEnd)
    .filter((value): value is number => value != null);

  const flowAxis = niceYAxisProps(colors, flowValues, {
    floor: undefined,
    width: 76,
    tickFormatter: formatSignedAxisValue,
  });
  const balanceAxis = niceYAxisProps(colors, balanceValues, {
    floor: 0,
    width: 76,
    tickFormatter: formatSignedAxisValue,
  });

  const formatActivityTick = (value: string | number) => {
    const row = chartData.find((item) => item.bucketKey === String(value));
    return row?.axisLabel ?? '';
  };

  return (
    <div className="address-activity-chart h-full w-full min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ ...CHART_MARGINS, left: 4, right: 20 }}
          stackOffset="sign"
        >
          <CartesianGrid
            stroke={colors.border}
            strokeOpacity={0.5}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="bucketKey"
            tick={{ fill: tickFill, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: colors.border, strokeOpacity: 0.6 }}
            minTickGap={period === '7d' ? 16 : 28}
            dy={6}
            tickFormatter={formatActivityTick}
          />
          <YAxis
            yAxisId="flow"
            {...flowAxis}
            tickLine={false}
            axisLine={false}
            label={yAxisTitleLabel('Primary', colors, 'left')}
            tickFormatter={formatSignedAxisValue}
          />
          <YAxis
            yAxisId="balance"
            orientation="right"
            {...balanceAxis}
            tickLine={false}
            axisLine={false}
            tick={{ fill: balanceSeriesColor(colors), fontSize: 11 }}
            label={yAxisTitleLabel('Secondary', colors, 'right')}
            tickFormatter={formatSignedAxisValue}
          />
          <Tooltip
            cursor={{ fill: colors.bgSubtle, opacity: 0.35 }}
            content={<AddressActivityTooltip colors={colors} chainId={chainId} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: tickFill, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {chainId === 'vrc' ? (
            <Bar
              yAxisId="flow"
              dataKey="staked"
              name="Staked"
              stackId="flow"
              fill={categoryFill(colors, 'warning')}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              animationDuration={CHART_ANIMATION.duration}
            />
          ) : (
            <>
              <Bar
                yAxisId="flow"
                dataKey="mined"
                name="Mined"
                stackId="flow"
                fill={categoryFill(colors, 'success')}
                maxBarSize={36}
                animationDuration={CHART_ANIMATION.duration}
              />
              <Bar
                yAxisId="flow"
                dataKey="received"
                name="Received"
                stackId="flow"
                fill={categoryFill(colors, 'accent')}
                maxBarSize={36}
                animationDuration={CHART_ANIMATION.duration}
              />
              <Bar
                yAxisId="flow"
                dataKey="spent"
                name="Spent"
                stackId="flow"
                fill={categoryFill(colors, 'danger')}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                animationDuration={CHART_ANIMATION.duration}
              />
            </>
          )}
          <Line
            yAxisId="balance"
            type="monotone"
            dataKey="balanceAtEnd"
            name="Balance"
            stroke={balanceSeriesColor(colors)}
            strokeWidth={2.25}
            dot={false}
            activeDot={{
              r: 4,
              fill: balanceSeriesColor(colors),
              stroke: colors.bgPanel,
              strokeWidth: 2,
            }}
            connectNulls
            animationDuration={CHART_ANIMATION.duration}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
