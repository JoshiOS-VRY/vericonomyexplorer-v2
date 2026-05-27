"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { PriceHistoryPoint } from "@/lib/api/types";
import { formatUsdPrice } from "@/lib/formatMarket";

interface PriceSparklineProps {
  data: PriceHistoryPoint[];
  ticker: string;
}

export function PriceSparkline({ data, ticker }: PriceSparklineProps) {
  const chartData = data.map((point) => ({
    time: point.time,
    value: point.value,
  }));

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const value = payload[0].value as number;
              return (
                <div className="rounded border border-border bg-bg-panel px-2 py-1 text-xs shadow-sm">
                  <span className="font-semibold tabular-nums">{formatUsdPrice(value, 4)}</span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            fill={`url(#spark-${ticker})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
