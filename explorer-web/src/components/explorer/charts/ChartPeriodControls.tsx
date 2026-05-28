"use client";

import type { AddressBalanceHistoryPeriodId } from "@/lib/api/types";
import { INSIGHTS_HISTORY_PERIODS } from "@/lib/insightsChartConfig";
import { cn } from "@/lib/utils";

export function ChartPeriodControls({
  period,
  onPeriodChange,
  loading,
  accentVar,
}: {
  period: AddressBalanceHistoryPeriodId;
  onPeriodChange: (next: AddressBalanceHistoryPeriodId) => void;
  loading?: boolean;
  accentVar?: string;
}) {
  return (
    <>
      <div className="chart-control-group hidden items-center gap-0.5 sm:inline-flex">
        {INSIGHTS_HISTORY_PERIODS.map((item) => {
          const active = period === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={loading}
              onClick={() => onPeriodChange(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-200",
                active
                  ? "shadow-sm"
                  : "text-fg-muted hover:bg-bg-panel hover:text-fg",
                loading && !active && "opacity-60",
              )}
              style={
                active
                  ? {
                      background: accentVar ?? "var(--accent)",
                      color: "var(--chain-btn-fg)",
                    }
                  : undefined
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <label className="relative sm:hidden">
        <span className="sr-only">Chart period</span>
        <select
          value={period}
          disabled={loading}
          onChange={(event) =>
            onPeriodChange(event.target.value as AddressBalanceHistoryPeriodId)
          }
          className="appearance-none rounded-md border border-border bg-bg-subtle py-1.5 pl-2.5 pr-8 text-xs font-medium text-fg"
        >
          {INSIGHTS_HISTORY_PERIODS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
