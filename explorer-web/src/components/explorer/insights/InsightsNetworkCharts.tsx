"use client";

import { useCallback, useEffect, useState } from "react";
import { ChartGroupControls } from "@/components/explorer/charts/ChartGroupControls";
import { ChartPeriodControls } from "@/components/explorer/charts/ChartPeriodControls";
import { ChartViewToggleInsights } from "@/components/explorer/charts/ChartViewToggle";
import { InsightsChartPanel } from "@/components/explorer/charts/InsightsChartPanel";
import {
  InsightsTimeSeriesChart,
  type TimeSeriesPoint,
} from "@/components/explorer/charts/InsightsTimeSeriesChart";
import {
  fetchNetworkHistoryClient,
  type NetworkMetricHistoryResult,
} from "@/lib/insights/networkHistory";
import {
  formatInsightsFooter,
  getChainAccentVar,
  getDefaultGroupForPeriod,
  getInsightsGroupLabel,
  INSIGHTS_HISTORY_PERIODS,
  type InsightsChartView,
  type InsightsHistoryGroupBy,
} from "@/lib/insightsChartConfig";
import type { AddressBalanceHistoryPeriodId } from "@/lib/api/types";
import { formatDifficulty, formatNumber } from "@/lib/utils";

/** Distinct, SVG-safe hex colors per metric (VRM gray is too subtle for charts) */
const VRM_SERIES_COLORS = {
  hashrateKhPerMin: "#418bca",
  difficulty: "#586a7a",
  supply: "#359b37",
  addressCount: "#7c6af0",
} as const;

const VRC_SERIES_COLORS = {
  interestRatePercent: "#418bca",
  percentStaked: "#359b37",
  expectedStakeTimeSeconds: "#f59e0b",
  difficulty: "#586a7a",
  supply: "#359b37",
  addressCount: "#7c6af0",
} as const;

function getSeriesColor(chainId: "vrm" | "vrc", dataKey: string): string {
  const palette = chainId === "vrm" ? VRM_SERIES_COLORS : VRC_SERIES_COLORS;
  return (palette as Record<string, string>)[dataKey] ?? "#418bca";
}

function NetworkMetricChart({
  chainId,
  title,
  dataKey,
  name,
  history,
  loading,
  error,
  period,
  onPeriodChange,
  groupBy,
  onGroupByChange,
  valueFormatter,
  allowedViews = ["line", "area"],
  referenceValue,
  referenceLabel,
}: {
  chainId: "vrm" | "vrc";
  title: string;
  dataKey: keyof NetworkMetricHistoryResult["buckets"][number];
  name: string;
  history: NetworkMetricHistoryResult | null;
  loading: boolean;
  error: string | null;
  period: AddressBalanceHistoryPeriodId;
  onPeriodChange: (next: AddressBalanceHistoryPeriodId) => void;
  groupBy: InsightsHistoryGroupBy;
  onGroupByChange: (next: InsightsHistoryGroupBy) => void;
  valueFormatter?: (value: number) => string;
  allowedViews?: InsightsChartView[];
  referenceValue?: number | null;
  referenceLabel?: string;
}) {
  const [view, setView] = useState<InsightsChartView>("area");
  const periodMeta = INSIGHTS_HISTORY_PERIODS.find((item) => item.id === period);
  const groupLabel = getInsightsGroupLabel(groupBy);
  const accentVar = getChainAccentVar(chainId);
  const seriesColor = getSeriesColor(chainId, String(dataKey));

  const points: TimeSeriesPoint[] =
    history?.buckets.map((bucket) => ({
      label: bucket.label,
      startTime: bucket.startTime,
      endTime: bucket.endTime,
      value: bucket[dataKey] as number | null,
    })) ?? [];
  const hasData = points.some(
    (point) => point.value != null && Number.isFinite(point.value),
  );

  return (
    <InsightsChartPanel
      chainId={chainId}
      title={title}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ChartViewToggleInsights
            view={view}
            onViewChange={setView}
            loading={loading}
            allowedViews={allowedViews}
          />
          <ChartGroupControls
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            loading={loading}
            accentVar={accentVar}
          />
          <ChartPeriodControls
            period={period}
            onPeriodChange={onPeriodChange}
            loading={loading}
            accentVar={accentVar}
          />
        </div>
      }
      loading={loading && !history}
      error={error}
      empty={
        history?.backfillRequired
          ? "Historical network metrics are still being collected."
          : !loading && !hasData
            ? "No data for this period yet."
            : null
      }
      footer={
        history && hasData
          ? formatInsightsFooter(
              history.buckets.length,
              `${periodMeta?.label ?? period} · ${groupLabel}`,
              history.availableSince
                ? `collecting live metrics since ${new Date(history.availableSince * 1000).toLocaleDateString()}`
                : undefined,
            )
          : loading
            ? "Updating…"
            : null
      }
    >
      {hasData ? (
        <InsightsTimeSeriesChart
          data={points}
          view={view}
          color={seriesColor}
          name={name}
          valueFormatter={valueFormatter}
          referenceValue={referenceValue}
          referenceLabel={referenceLabel}
          chainId={chainId}
        />
      ) : null}
    </InsightsChartPanel>
  );
}

export function InsightsNetworkCharts({
  chainId,
  maxSupply,
}: {
  chainId: "vrm" | "vrc";
  maxSupply?: number | null;
}) {
  const [period, setPeriod] = useState<AddressBalanceHistoryPeriodId>("30d");
  const [groupBy, setGroupBy] = useState<InsightsHistoryGroupBy>(() =>
    getDefaultGroupForPeriod("30d"),
  );
  const [history, setHistory] = useState<NetworkMetricHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePeriodChange = useCallback((next: AddressBalanceHistoryPeriodId) => {
    setPeriod(next);
    setGroupBy(getDefaultGroupForPeriod(next));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHistory(await fetchNetworkHistoryClient(chainId, period, groupBy));
    } catch {
      setError("Unable to load network history.");
    } finally {
      setLoading(false);
    }
  }, [chainId, period, groupBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const shared = {
    chainId,
    history,
    loading,
    error,
    period,
    onPeriodChange: handlePeriodChange,
    groupBy,
    onGroupByChange: setGroupBy,
  };

  if (chainId === "vrm") {
    return (
      <>
        <NetworkMetricChart
          {...shared}
          title="Network hashrate"
          dataKey="hashrateKhPerMin"
          name="Hashrate (kH/min)"
          valueFormatter={(value) => formatNumber(value)}
          allowedViews={["line", "area"]}
        />
        <NetworkMetricChart
          {...shared}
          title="Difficulty"
          dataKey="difficulty"
          name="Difficulty"
          valueFormatter={(value) => formatDifficulty(String(value))}
          allowedViews={["line", "area"]}
        />
        <NetworkMetricChart
          {...shared}
          title="Estimated supply"
          dataKey="supply"
          name="Supply"
          valueFormatter={(value) => formatNumber(value)}
          allowedViews={["area"]}
          referenceValue={maxSupply ?? undefined}
          referenceLabel="Max supply"
        />
        <NetworkMetricChart
          {...shared}
          title="Address growth"
          dataKey="addressCount"
          name="Addresses"
          valueFormatter={(value) => formatNumber(value)}
          allowedViews={["area"]}
        />
      </>
    );
  }

  return (
    <>
      <NetworkMetricChart
        {...shared}
        title="Interest rate"
        dataKey="interestRatePercent"
        name="Interest %"
        valueFormatter={(value) => `${value.toFixed(2)}%`}
        allowedViews={["line", "area"]}
      />
      <NetworkMetricChart
        {...shared}
        title="Staking participation"
        dataKey="percentStaked"
        name="% Staked"
        valueFormatter={(value) => `${value.toFixed(2)}%`}
        allowedViews={["line", "area"]}
      />
      <NetworkMetricChart
        {...shared}
        title="Expected stake time"
        dataKey="expectedStakeTimeSeconds"
        name="Expected time (s)"
        valueFormatter={(value) => formatNumber(value)}
        allowedViews={["line"]}
      />
      <NetworkMetricChart
        {...shared}
        title="Difficulty"
        dataKey="difficulty"
        name="Difficulty"
        valueFormatter={(value) => formatDifficulty(String(value))}
        allowedViews={["line", "area"]}
      />
      <NetworkMetricChart
        {...shared}
        title="Supply"
        dataKey="supply"
        name="Supply"
        valueFormatter={(value) => formatNumber(value)}
        allowedViews={["area"]}
        referenceValue={maxSupply ?? undefined}
        referenceLabel="Max supply"
      />
      <NetworkMetricChart
        {...shared}
        title="Address growth"
        dataKey="addressCount"
        name="Addresses"
        valueFormatter={(value) => formatNumber(value)}
        allowedViews={["area"]}
      />
    </>
  );
}
