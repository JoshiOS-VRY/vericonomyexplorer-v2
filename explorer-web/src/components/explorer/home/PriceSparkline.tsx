"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { PriceHistoryPoint } from "@/lib/api/types";
import { gradientId } from "@/lib/chartVisuals";
import { getChainAccentVar } from "@/lib/insightsChartConfig";
import { formatUsdPrice } from "@/lib/formatMarket";
import { useResolvedCssColor } from "@/hooks/useResolvedCssColor";

interface PriceSparklineProps {
  data: PriceHistoryPoint[];
  ticker: string;
}

export function PriceSparkline({ data, ticker }: PriceSparklineProps) {
  const baseId = useId();
  const fillGradientId = gradientId(baseId, "spark-fill");
  const chainVar = ticker === "VRM" ? getChainAccentVar("vrm") : getChainAccentVar("vrc");
  const chainAccent = useResolvedCssColor(chainVar);
  const chartData = data.map((point) => ({
    time: point.time,
    value: point.value,
  }));

  return (
    <div className="insights-sparkline h-16 w-full overflow-hidden rounded-md">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chainAccent} stopOpacity={0.42} />
              <stop offset="100%" stopColor={chainAccent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const value = payload[0].value as number;
              return (
                <div className="insights-chart-tooltip rounded-lg border border-border/80 bg-bg-panel/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md">
                  <span className="font-bold tabular-nums">{formatUsdPrice(value, 4)}</span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chainAccent}
            strokeWidth={2}
            fill={`url(#${fillGradientId})`}
            isAnimationActive={false}
            activeDot={{
              r: 3,
              fill: chainAccent,
              stroke: "var(--bg-panel)",
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
