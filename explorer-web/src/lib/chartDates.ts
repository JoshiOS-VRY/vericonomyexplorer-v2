const CHART_AXIS_DATE: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};

const CHART_DATETIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
};

export function startOfUtcDay(unixSeconds: number): number {
  const date = new Date(unixSeconds * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

/** Axis tick / bucket label — UTC calendar day (matches block timestamps). */
export function formatChartAxisDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', CHART_AXIS_DATE);
}

/** Tooltip date (same as axis). */
export function formatChartTooltipDate(unixSeconds: number): string {
  return formatChartAxisDate(unixSeconds);
}

/** Tooltip range subtitle for bucketed series. */
export function formatChartTooltipRange(startTime: number, endTime: number): string {
  return `${formatChartTooltipDate(startTime)} – ${formatChartTooltipDate(endTime)}`;
}

/** Activity bucket label shared by axis ticks and tooltips. */
export function formatActivityBucketAxisLabel(startTime: number, endTime: number): string {
  if (startOfUtcDay(startTime) !== startOfUtcDay(endTime)) {
    return formatChartTooltipRange(startTime, endTime);
  }

  return formatChartAxisDate(startTime);
}

/** Point-in-time tooltip with clock time (UTC). */
export function formatChartDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', CHART_DATETIME);
}
