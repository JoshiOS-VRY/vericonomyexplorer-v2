'use client';

import type { ChartThemeColors } from '@/hooks/useChartTheme';
import { formatCompactAxisValue } from '@/lib/chartVisuals';

const FALLBACK: ChartThemeColors = {
  accent: 'rgb(65, 139, 202)',
  fg: 'rgb(226, 232, 240)',
  fgMuted: 'rgb(148, 163, 184)',
  fgSubtle: 'rgb(100, 116, 139)',
  border: 'rgb(51, 65, 85)',
  bgPanel: 'rgb(26, 34, 48)',
  bgSubtle: 'rgb(11, 16, 24)',
  success: 'rgb(53, 155, 55)',
  warning: 'rgb(245, 158, 11)',
  danger: 'rgb(233, 58, 93)',
};

function pickColor(colors: ChartThemeColors, key: keyof ChartThemeColors): string {
  const value = colors[key];
  return value && value.trim() !== '' ? value : FALLBACK[key];
}

export function chartGridProps(colors: ChartThemeColors) {
  return {
    stroke: pickColor(colors, 'border'),
    strokeOpacity: 0.45,
    strokeDasharray: '4 6',
    vertical: false,
  };
}

export function chartXAxisProps(colors: ChartThemeColors) {
  const tickColor = pickColor(colors, 'fgSubtle');
  return {
    dataKey: 'label' as const,
    tick: { fill: tickColor, fontSize: 11, fontWeight: 500 },
    tickLine: false,
    axisLine: { stroke: pickColor(colors, 'border'), strokeOpacity: 0.7 },
    tickMargin: 10,
    minTickGap: 20,
    height: 36,
  };
}

/** Fraction of the data span added above max and below min on insights charts. */
export const CHART_DOMAIN_PADDING_RATIO = 0.08;

export function paddedChartDomain(
  values: number[],
  paddingRatio = CHART_DOMAIN_PADDING_RATIO,
  options?: { floor?: number; ceiling?: number }
): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return [0, 1];

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  if (min === max) {
    const pad = Math.abs(min) * paddingRatio || paddingRatio;
    min -= pad;
    max += pad;
  } else {
    const span = max - min;
    const pad = span * paddingRatio;
    min -= pad;
    max += pad;
  }

  if (options?.floor != null) {
    min = Math.max(options.floor, min);
  }
  if (options?.ceiling != null) {
    max = Math.min(options.ceiling, max);
  }

  return [min, max];
}

export function chartYAxisProps(
  colors: ChartThemeColors,
  options?: {
    allowDecimals?: boolean;
    tickFormatter?: (value: number) => string;
    width?: number;
    domain?: [number, number];
  }
) {
  const tickColor = pickColor(colors, 'fgSubtle');
  return {
    tick: { fill: tickColor, fontSize: 11, fontWeight: 500 },
    tickLine: false,
    axisLine: false,
    width: options?.width ?? 60,
    allowDecimals: options?.allowDecimals ?? true,
    tickFormatter:
      options?.tickFormatter ?? ((value: number) => formatCompactAxisValue(Number(value))),
    tickMargin: 6,
    ...(options?.domain ? { domain: options.domain } : {}),
  };
}

export function chartCursorProps(colors: ChartThemeColors) {
  return {
    stroke: pickColor(colors, 'fgMuted'),
    strokeOpacity: 0.45,
    strokeWidth: 1,
    strokeDasharray: '4 4',
  };
}
