"use client";

import { useCallback, useState } from "react";
import {
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
import {
  CHAIN_ACTIVITY_HISTORY_PERIODS,
  fetchChainActivityHistoryClient,
} from "@/lib/chainActivityHistory";
import type {
  AddressBalanceHistoryPeriodId,
  ChainActivityChartView,
  ChainActivityHistoryResult,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CHART_VIEWS: { id: ChainActivityChartView; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "blocks", label: "Blocks" },
];

const CATEGORY_COLORS: Record<string, keyof ReturnType<typeof useChartTheme>> = {
  mined: "success",
  staked: "warning",
  received: "accent",
  blocks: "accent",
};

function ChainChartHeaderControls({
  view,
  onViewChange,
  period,
  onPeriodChange,
  loading,
}: {
  view: ChainActivityChartView;
  onViewChange: (next: ChainActivityChartView) => void;
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
      <div className="hidden items-center gap-1 sm:inline-flex">
        {CHAIN_ACTIVITY_HISTORY_PERIODS.map((item) => {
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
          onChange={(event) =>
            onPeriodChange(event.target.value as AddressBalanceHistoryPeriodId)
          }
          className="appearance-none rounded-md border border-border bg-bg-subtle py-1.5 pl-2.5 pr-8 text-xs font-medium text-fg"
        >
          {CHAIN_ACTIVITY_HISTORY_PERIODS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CountChartTooltip({
  active,
  payload,
  label,
  colors,
  unit,
}: TooltipProps<number, string> & {
  colors: ReturnType<typeof useChartTheme>;
  unit: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as { startTime?: number; endTime?: number } | undefined;
  const range =
    row?.startTime != null && row?.endTime != null
      ? `${new Date(row.startTime * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(row.endTime * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : null;

  const entries = payload.filter(
    (item) => typeof item.value === "number" && Number(item.value) > 0,
  );

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
              {Number(item.value).toLocaleString()} {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VrmChainActivityChart({
  initialHistory,
}: {
  initialHistory: ChainActivityHistoryResult;
}) {
  const colors = useChartTheme();
  const [view, setView] = useState<ChainActivityChartView>("activity");
  const [period, setPeriod] = useState<AddressBalanceHistoryPeriodId>("30d");
  const [history, setHistory] = useState<ChainActivityHistoryResult>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(async (nextPeriod: AddressBalanceHistoryPeriodId) => {
    setLoading(true);
    setError(null);

    try {
      const nextHistory = await fetchChainActivityHistoryClient("vrm", nextPeriod);
      setHistory(nextHistory);
      setPeriod(nextPeriod);
    } catch {
      setError("Unable to load chart data for this period.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePeriodChange = (next: AddressBalanceHistoryPeriodId) => {
    if (next === period || loading) {
      return;
    }

    if (next === "30d") {
      setHistory(initialHistory);
      setPeriod("30d");
      setError(null);
      return;
    }

    void loadPeriod(next);
  };

  const periodMeta = CHAIN_ACTIVITY_HISTORY_PERIODS.find((item) => item.id === period);
  const panelTitle = view === "blocks" ? "Block production" : "Chain activity";

  const activityData = history.buckets.map((bucket) => ({
    label: bucket.label,
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    mined: bucket.minedCount,
    staked: bucket.stakedCount,
    received: bucket.receivedCount,
  }));

  const blocksData = history.buckets.map((bucket) => ({
    label: bucket.label,
    startTime: bucket.startTime,
    endTime: bucket.endTime,
    blocks: bucket.blockCount,
  }));

  const hasActivity = activityData.some(
    (row) => row.mined > 0 || row.staked > 0 || row.received > 0,
  );
  const hasBlocks = blocksData.some((row) => row.blocks > 0);
  const hasData = view === "blocks" ? hasBlocks : hasActivity;
  const ready = Boolean(colors.accent);
  const categoryFill = (id: string) => colors[CATEGORY_COLORS[id] ?? "accent"];

  if (!history.buckets.length && !loading) {
    return (
      <BcPanel title={panelTitle}>
        <p className="text-sm text-fg-muted">No chain activity data available yet.</p>
      </BcPanel>
    );
  }

  return (
    <BcPanel
      title={panelTitle}
      action={
        <ChainChartHeaderControls
          view={view}
          onViewChange={setView}
          period={period}
          onPeriodChange={handlePeriodChange}
          loading={loading}
        />
      }
    >
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {loading && !hasData ? (
        <AddressChartSkeleton />
      ) : !hasData ? (
        <p className="text-sm text-fg-muted">
          No {view === "blocks" ? "blocks" : "transactions"} in the {periodMeta?.label ?? "selected"} period.
        </p>
      ) : (
        <div
          className={cn(
            "address-balance-chart h-80 w-full sm:h-96",
            loading && "pointer-events-none opacity-60",
          )}
        >
          {ready ? (
            <ResponsiveContainer width="100%" height="100%">
              {view === "blocks" ? (
                <BarChart data={blocksData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid
                    stroke={colors.border}
                    strokeOpacity={0.5}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: colors.fgSubtle, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: colors.border }}
                  />
                  <YAxis
                    tick={{ fill: colors.fgSubtle, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <CountChartTooltip colors={colors} unit="blocks" />
                    }
                  />
                  <Bar
                    dataKey="blocks"
                    name="Blocks"
                    fill={categoryFill("blocks")}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={activityData}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  stackOffset="sign"
                >
                  <CartesianGrid
                    stroke={colors.border}
                    strokeOpacity={0.5}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: colors.fgSubtle, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: colors.border }}
                  />
                  <YAxis
                    tick={{ fill: colors.fgSubtle, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <CountChartTooltip colors={colors} unit="tx" />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: colors.fgMuted }}
                    formatter={(value) => (
                      <span style={{ color: colors.fgMuted }}>{value}</span>
                    )}
                  />
                  <Bar dataKey="mined" name="Mined" stackId="a" fill={categoryFill("mined")} />
                  <Bar dataKey="staked" name="Staked" stackId="a" fill={categoryFill("staked")} />
                  <Bar dataKey="received" name="Transfers" stackId="a" fill={categoryFill("received")} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              Loading chart…
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-fg-subtle">
        {loading ? "Updating…" : null}
        {!loading && hasData ? (
          <>
            {history.buckets.length.toLocaleString()} period{history.buckets.length === 1 ? "" : "s"}
            {periodMeta?.label ? ` · ${periodMeta.label}` : ""}
          </>
        ) : null}
      </p>
    </BcPanel>
  );
}
