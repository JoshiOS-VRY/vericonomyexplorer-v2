const CHART_AXIS_DATE: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const CHART_DATETIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Axis tick / bucket label — always includes the year. */
export function formatChartAxisDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, CHART_AXIS_DATE);
}

/** Tooltip date (same granularity as axis labels). */
export function formatChartTooltipDate(unixSeconds: number): string {
  return formatChartAxisDate(unixSeconds);
}

/** Tooltip range subtitle for bucketed series. */
export function formatChartTooltipRange(startTime: number, endTime: number): string {
  return `${formatChartTooltipDate(startTime)} – ${formatChartTooltipDate(endTime)}`;
}

/** Point-in-time tooltip with clock time. */
export function formatChartDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, CHART_DATETIME);
}
