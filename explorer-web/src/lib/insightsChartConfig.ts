import type { AddressBalanceHistoryPeriodId } from "@/lib/api/types";
import { getChainChartColor } from "@/lib/resolveCssColor";

export const INSIGHTS_HISTORY_PERIODS: {
  id: AddressBalanceHistoryPeriodId;
  label: string;
  days: number | null;
  maxPoints: number;
}[] = [
  { id: "7d", label: "7D", days: 7, maxPoints: 80 },
  { id: "30d", label: "30D", days: 30, maxPoints: 100 },
  { id: "90d", label: "90D", days: 90, maxPoints: 100 },
  { id: "1y", label: "1Y", days: 365, maxPoints: 120 },
  { id: "all", label: "All", days: null, maxPoints: 120 },
];

export type InsightsChartView = "line" | "area" | "bar";

export type InsightsHistoryGroupBy = "day" | "week" | "month" | "year";

export const INSIGHTS_HISTORY_GROUPS: { id: InsightsHistoryGroupBy; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

export function getDefaultGroupForPeriod(
  periodId: AddressBalanceHistoryPeriodId,
): InsightsHistoryGroupBy {
  switch (periodId) {
    case "7d":
    case "30d":
      return "day";
    case "90d":
      return "week";
    case "1y":
      return "month";
    default:
      return "year";
  }
}

export function getInsightsGroupLabel(groupBy: InsightsHistoryGroupBy): string {
  return INSIGHTS_HISTORY_GROUPS.find((item) => item.id === groupBy)?.label ?? groupBy;
}

export const INSIGHTS_CHART_VIEWS: { id: InsightsChartView; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "bar", label: "Bar" },
];

export function getInsightsHistorySince(
  periodId: AddressBalanceHistoryPeriodId,
): number | undefined {
  const period = INSIGHTS_HISTORY_PERIODS.find((item) => item.id === periodId);
  if (!period?.days) {
    return undefined;
  }

  return Math.floor(Date.now() / 1000) - period.days * 86_400;
}

export function getInsightsHistoryMaxPoints(
  periodId: AddressBalanceHistoryPeriodId,
): number {
  return INSIGHTS_HISTORY_PERIODS.find((item) => item.id === periodId)?.maxPoints ?? 120;
}

export function getChainAccentVar(chainId: "vrm" | "vrc"): string {
  return chainId === "vrm" ? "var(--chain-vrm)" : "var(--chain-vrc)";
}

/** Resolved rgb color safe for SVG/Recharts attributes */
export function getChainAccentColor(chainId: "vrm" | "vrc"): string {
  return getChainChartColor(chainId);
}

export function formatInsightsFooter(
  bucketCount: number,
  periodLabel?: string,
  extra?: string,
): string {
  const parts = [
    `${bucketCount.toLocaleString()} period${bucketCount === 1 ? "" : "s"}`,
    periodLabel,
    extra,
  ].filter(Boolean);
  return parts.join(" · ");
}
