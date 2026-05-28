"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
} from "@/components/explorer/charts/chartAxis";
import { ThemedChartTooltip } from "@/components/explorer/charts/ThemedChartTooltip";
import { useChartTheme } from "@/hooks/useChartTheme";
import { CHART_ANIMATION, CHART_MARGINS, formatCompactAxisValue } from "@/lib/chartVisuals";
import type { InsightsChartView } from "@/lib/insightsChartConfig";

export interface TimeSeriesPoint {
  label: string;
  startTime?: number;
  endTime?: number;
  value: number | null;
}

export function InsightsTimeSeriesChart({
  data,
  view,
  color,
  name,
  valueFormatter,
  referenceValue,
  referenceLabel,
}: {
  data: TimeSeriesPoint[];
  view: InsightsChartView;
  color: string;
  name: string;
  valueFormatter?: (value: number) => string;
  referenceValue?: number | null;
  referenceLabel?: string;
  chainId?: "vrm" | "vrc";
}) {
  const colors = useChartTheme();
  const chartData = data.filter((point) => point.value != null && Number.isFinite(point.value));

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-fg-muted sm:h-96">
        No data points in range
      </div>
    );
  }

  const formatValue = (value: number) =>
    valueFormatter ? valueFormatter(value) : value.toLocaleString();

  const grid = chartGridProps(colors);
  const xAxis = chartXAxisProps(colors);
  const yAxis = chartYAxisProps(colors, {
    width: 76,
    tickFormatter: (value) => formatCompactAxisValue(Number(value)),
  });
  const tickFill = colors.fgSubtle || "#64748b";
  const axisStroke = colors.border || "#94a3b8";

  return (
    <div className="address-balance-chart h-80 w-full min-h-[320px] sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        {view === "bar" ? (
          <BarChart data={chartData} margin={CHART_MARGINS}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis} />
            <Tooltip
              content={
                <ThemedChartTooltip
                  colors={colors}
                  accentColor={color}
                  valueFormatter={(value) => formatValue(value)}
                />
              }
            />
            {referenceValue != null ? (
              <ReferenceLine
                y={referenceValue}
                stroke={axisStroke}
                strokeDasharray="4 4"
                label={{
                  value: referenceLabel ?? "Max",
                  fill: tickFill,
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            ) : null}
            <Bar
              dataKey="value"
              name={name}
              fill={color}
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              animationDuration={CHART_ANIMATION.duration}
            />
          </BarChart>
        ) : view === "area" ? (
          <AreaChart data={chartData} margin={CHART_MARGINS}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis} />
            <Tooltip
              content={
                <ThemedChartTooltip
                  colors={colors}
                  accentColor={color}
                  valueFormatter={(value) => formatValue(value)}
                />
              }
            />
            {referenceValue != null ? (
              <ReferenceLine
                y={referenceValue}
                stroke={axisStroke}
                strokeDasharray="4 4"
                label={{
                  value: referenceLabel ?? "Max",
                  fill: tickFill,
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="value"
              name={name}
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={2}
              activeDot={{ r: 4, fill: color, stroke: colors.bgPanel, strokeWidth: 2 }}
              animationDuration={CHART_ANIMATION.duration}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={CHART_MARGINS}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis} />
            <Tooltip
              content={
                <ThemedChartTooltip
                  colors={colors}
                  accentColor={color}
                  valueFormatter={(value) => formatValue(value)}
                />
              }
            />
            {referenceValue != null ? (
              <ReferenceLine
                y={referenceValue}
                stroke={axisStroke}
                strokeDasharray="4 4"
                label={{
                  value: referenceLabel ?? "Max",
                  fill: tickFill,
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              name={name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: colors.bgPanel, strokeWidth: 2 }}
              animationDuration={CHART_ANIMATION.duration}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
