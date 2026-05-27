"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { AddressChartSkeleton } from "@/components/explorer/address/AddressSectionSkeleton";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useTheme } from "@/hooks/useTheme";
import {
  ADDRESS_BALANCE_HISTORY_PERIODS,
  fetchAddressBalanceHistoryClient,
} from "@/lib/addressBalanceHistory";
import type {
  AddressBalanceChartView,
  AddressBalanceHistoryPeriodId,
  AddressBalanceHistoryResult,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CHART_VIEWS: { id: AddressBalanceChartView; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "balance", label: "Balance" },
];

const CATEGORY_COLORS: Record<string, keyof ReturnType<typeof useChartTheme>> = {
  mined: "success",
  staked: "warning",
  received: "accent",
  spent: "danger",
};

function ChartHeaderControls({
  view,
  onViewChange,
  period,
  onPeriodChange,
  loading,
}: {
  view: AddressBalanceChartView;
  onViewChange: (next: AddressBalanceChartView) => void;
  period: AddressBalanceHistoryPeriodId;
  onPeriodChange: (next: AddressBalanceHistoryPeriodId) => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="inline-flex rounded-md border border-border bg-bg-subtle p-0.5">
        {CHART_VIEWS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={loading}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-semibold transition",
                active
                  ? "bg-bg-panel text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
                loading && !active && "opacity-60",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <BalanceHistoryPeriodControls
        period={period}
        onPeriodChange={onPeriodChange}
        loading={loading}
      />
    </div>
  );
}

function ActivityChartTooltip({
  active,
  payload,
  label,
  colors,
}: TooltipProps<number, string> & {
  colors: ReturnType<typeof useChartTheme>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as {
    ticker?: string;
    startTime?: number;
    endTime?: number;
  } | undefined;
  const ticker = row?.ticker ?? "VRM";
  const range =
    row?.startTime != null && row?.endTime != null
      ? `${new Date(row.startTime * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(row.endTime * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : null;

  const entries = payload
    .filter((item) => typeof item.value === "number" && Math.abs(item.value) > 0)
    .sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)));

  return (
    <div
      className="rounded-md border px-3 py-2 shadow-md"
      style={{
        background: colors.bgPanel,
        borderColor: colors.border,
        color: colors.fg,
      }}
    >
      <p className="text-[11px] font-medium" style={{ color: colors.fgMuted }}>
        {label}
      </p>
      {range ? (
        <p className="text-[11px]" style={{ color: colors.fgSubtle }}>
          {range}
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {entries.map((item) => (
          <li key={item.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="font-medium" style={{ color: colors.fgMuted }}>
              {item.name}
            </span>
            <span className="font-semibold tabular-nums">
              {Math.abs(Number(item.value)).toLocaleString(undefined, { maximumFractionDigits: 8 })} {ticker}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BalanceChartTooltip({
  active,
  payload,
  label,
  colors,
}: TooltipProps<number, string> & {
  colors: ReturnType<typeof useChartTheme>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as {
    ticker?: string;
    time?: number;
    height?: number | null;
  } | undefined;
  const ticker = point?.ticker ?? "VRM";
  const value = payload[0]?.value;
  const time =
    point?.time != null
      ? new Date(point.time * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <div
      className="rounded-md border px-3 py-2 shadow-md"
      style={{
        background: colors.bgPanel,
        borderColor: colors.border,
        color: colors.fg,
      }}
    >
      <p className="text-[11px] font-medium" style={{ color: colors.fgMuted }}>
        {point?.height != null ? `Block ${point.height}` : label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {typeof value === "number"
          ? `${value.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${ticker}`
          : "—"}
      </p>
      {time ? (
        <p className="mt-0.5 text-[11px]" style={{ color: colors.fgSubtle }}>
          {time}
        </p>
      ) : null}
    </div>
  );
}

function BalanceHistoryPeriodControls({
  period,
  onPeriodChange,
  loading,
}: {
  period: AddressBalanceHistoryPeriodId;
  onPeriodChange: (next: AddressBalanceHistoryPeriodId) => void;
  loading: boolean;
}) {
  return (
    <>
      <div className="hidden items-center gap-1 sm:inline-flex">
        {ADDRESS_BALANCE_HISTORY_PERIODS.map((item) => {
          const active = period === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={loading}
              onClick={() => onPeriodChange(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                active
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-bg-subtle text-fg-muted hover:bg-bg-panel hover:text-fg",
                loading && !active && "opacity-60",
              )}
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
          onChange={(event) => onPeriodChange(event.target.value as AddressBalanceHistoryPeriodId)}
          className="appearance-none rounded-md border border-border bg-bg-subtle py-1.5 pl-2.5 pr-8 text-xs font-medium text-fg"
        >
          {ADDRESS_BALANCE_HISTORY_PERIODS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function ActivityBarChart({
  chartData,
  colors,
  period,
}: {
  chartData: {
    label: string;
    mined: number;
    staked: number;
    received: number;
    spent: number;
  }[];
  colors: ReturnType<typeof useChartTheme>;
  period: AddressBalanceHistoryPeriodId;
}) {
  const categoryFill = (id: string) => colors[CATEGORY_COLORS[id] ?? "accent"];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }} stackOffset="sign">
        <CartesianGrid stroke={colors.border} strokeOpacity={0.5} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.fgSubtle, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.border, strokeOpacity: 0.6 }}
          minTickGap={period === "7d" ? 16 : 28}
          dy={6}
        />
        <YAxis
          tick={{ fill: colors.fgSubtle, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={76}
          tickFormatter={(value: number) =>
            Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
          }
        />
        <Tooltip
          cursor={{ fill: colors.bgSubtle, opacity: 0.35 }}
          content={<ActivityChartTooltip colors={colors} />}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: colors.fgMuted }}
          formatter={(value) => <span style={{ color: colors.fgMuted }}>{value}</span>}
        />
        <Bar dataKey="mined" name="Mined" stackId="activity" fill={categoryFill("mined")} maxBarSize={48} />
        <Bar dataKey="staked" name="Staked" stackId="activity" fill={categoryFill("staked")} maxBarSize={48} />
        <Bar dataKey="received" name="Received" stackId="activity" fill={categoryFill("received")} maxBarSize={48} />
        <Bar dataKey="spent" name="Spent" stackId="activity" fill={categoryFill("spent")} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CumulativeBalanceChart({
  chartData,
  colors,
  period,
  gradientId,
  fillTopOpacity,
  fillBottomOpacity,
}: {
  chartData: {
    label: string;
    balance: number;
    time: number;
    height: number | null;
    ticker: string;
  }[];
  colors: ReturnType<typeof useChartTheme>;
  period: AddressBalanceHistoryPeriodId;
  gradientId: string;
  fillTopOpacity: number;
  fillBottomOpacity: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={fillTopOpacity} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={fillBottomOpacity} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.border} strokeOpacity={0.5} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.fgSubtle, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.border, strokeOpacity: 0.6 }}
          minTickGap={period === "7d" ? 24 : 32}
          dy={6}
        />
        <YAxis
          tick={{ fill: colors.fgSubtle, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={76}
          tickFormatter={(value: number) =>
            value.toLocaleString(undefined, { maximumFractionDigits: 4 })
          }
        />
        <Tooltip
          cursor={{ stroke: colors.border, strokeWidth: 1, strokeDasharray: "4 4" }}
          content={<BalanceChartTooltip colors={colors} />}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={colors.accent}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 4,
            fill: colors.accent,
            stroke: colors.bgPanel,
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function formatBalancePointLabel(time: number, period: AddressBalanceHistoryPeriodId): string {
  const date = new Date(time * 1000);
  if (period === "all") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  if (period === "1y") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AddressBalanceChart({
  chainId,
  address,
  initialHistory,
}: {
  chainId: string;
  address: string;
  initialHistory?: AddressBalanceHistoryResult;
}) {
  const colors = useChartTheme();
  const { resolved } = useTheme();
  const gradientId = useId().replace(/:/g, "");
  const fillTopOpacity = resolved === "light" ? 0.28 : 0.38;
  const fillBottomOpacity = resolved === "light" ? 0.06 : 0.03;

  const allHistoryRef = useRef<AddressBalanceHistoryResult | null>(initialHistory ?? null);
  const [view, setView] = useState<AddressBalanceChartView>("activity");
  const [period, setPeriod] = useState<AddressBalanceHistoryPeriodId>("all");
  const [history, setHistory] = useState<AddressBalanceHistoryResult | null>(initialHistory ?? null);
  const [loading, setLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHistory) {
      allHistoryRef.current = initialHistory;
      setHistory(initialHistory);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const nextHistory = await fetchAddressBalanceHistoryClient(chainId, address, "all");
        if (!cancelled) {
          allHistoryRef.current = nextHistory;
          setHistory(nextHistory);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load chart data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, chainId, initialHistory]);

  const loadPeriod = useCallback(
    async (nextPeriod: AddressBalanceHistoryPeriodId) => {
      setLoading(true);
      setError(null);

      try {
        const nextHistory = await fetchAddressBalanceHistoryClient(chainId, address, nextPeriod);
        setHistory(nextHistory);
        setPeriod(nextPeriod);
      } catch {
        setError("Unable to load chart data for this period.");
      } finally {
        setLoading(false);
      }
    },
    [address, chainId],
  );

  const handlePeriodChange = (next: AddressBalanceHistoryPeriodId) => {
    if (next === period || loading) {
      return;
    }

    if (next === "all") {
      if (allHistoryRef.current) {
        setHistory(allHistoryRef.current);
      }
      setPeriod("all");
      setError(null);
      return;
    }

    void loadPeriod(next);
  };

  const periodMeta = ADDRESS_BALANCE_HISTORY_PERIODS.find((item) => item.id === period);
  const panelTitle = view === "balance" ? "Cumulative balance" : "Balance activity";

  if (loading && !history) {
    return <AddressChartSkeleton />;
  }

  if (!history) {
    return (
      <BcPanel title={panelTitle}>
        <p className="text-sm text-fg-muted">{error ?? "Unable to load chart data."}</p>
      </BcPanel>
    );
  }

  if (history.truncated) {
    return (
      <BcPanel
        title={panelTitle}
        action={
          <ChartHeaderControls
            view={view}
            onViewChange={setView}
            period={period}
            onPeriodChange={handlePeriodChange}
            loading={loading}
          />
        }
      >
        <p className="text-sm text-fg-muted">
          Chart data is unavailable for this address ({history.eventCount?.toLocaleString()} events exceed the
          activity limit).
        </p>
      </BcPanel>
    );
  }

  const activityData = history.buckets.map((bucket) => ({
    label: bucket.label,
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    ticker: bucket.ticker,
    mined: bucket.minedAmount,
    staked: bucket.stakedAmount,
    received: bucket.receivedAmount,
    spent: bucket.spentAmount,
  }));

  const balanceData = history.points.map((point) => ({
    label: formatBalancePointLabel(point.time, period),
    balance: point.balanceAmount,
    time: point.time,
    height: point.height,
    ticker: point.ticker,
  }));

  const hasActivity = activityData.some(
    (row) => row.mined > 0 || row.staked > 0 || row.received > 0 || row.spent < 0,
  );
  const hasBalance = balanceData.length > 0;
  const hasData = view === "balance" ? hasBalance : hasActivity;
  const ready = Boolean(colors.accent);

  return (
    <BcPanel
      title={panelTitle}
      action={
        <ChartHeaderControls
          view={view}
          onViewChange={setView}
          period={period}
          onPeriodChange={handlePeriodChange}
          loading={loading}
        />
      }
    >
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {!hasData ? (
        <p className="text-sm text-fg-muted">
          No {view === "balance" ? "balance history" : "activity"} in the {periodMeta?.label ?? "selected"} period.
        </p>
      ) : (
        <div
          className={cn(
            "address-balance-chart h-80 w-full sm:h-96",
            loading && "pointer-events-none opacity-60",
          )}
        >
          {ready ? (
            view === "balance" ? (
              <CumulativeBalanceChart
                chartData={balanceData}
                colors={colors}
                period={period}
                gradientId={gradientId}
                fillTopOpacity={fillTopOpacity}
                fillBottomOpacity={fillBottomOpacity}
              />
            ) : (
              <ActivityBarChart chartData={activityData} colors={colors} period={period} />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">Loading chart…</div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-fg-subtle">
        {loading ? "Updating…" : null}
        {!loading && hasData ? (
          <>
            {view === "balance"
              ? `${history.points.length.toLocaleString()} point${history.points.length === 1 ? "" : "s"}`
              : `${history.buckets.length.toLocaleString()} period${history.buckets.length === 1 ? "" : "s"}`}
            {periodMeta?.label ? ` · ${periodMeta.label}` : ""}
            {history.eventCount != null ? ` · ${history.eventCount.toLocaleString()} events` : ""}
          </>
        ) : null}
      </p>
    </BcPanel>
  );
}
