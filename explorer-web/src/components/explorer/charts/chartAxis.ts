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

const NICE_STEP_THRESHOLDS = [1, 2, 5, 10] as const;

function niceStep(range: number, tickCount = 5): number {
  if (!Number.isFinite(range) || range <= 0) {
    return 1;
  }

  const rough = range / Math.max(tickCount - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  let niceUnit = NICE_STEP_THRESHOLDS[NICE_STEP_THRESHOLDS.length - 1];

  for (const threshold of NICE_STEP_THRESHOLDS) {
    if (normalized <= threshold) {
      niceUnit = threshold;
      break;
    }
  }

  return niceUnit * magnitude;
}

function snapDown(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function snapUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/** Padded domain with min/max snapped to visually round tick steps. */
export function niceChartDomain(
  values: number[],
  options?: {
    floor?: number;
    tickCount?: number;
    paddingRatio?: number;
  }
): [number, number] {
  const tickCount = options?.tickCount ?? 5;
  const [paddedMin, paddedMax] = paddedChartDomain(
    values,
    options?.paddingRatio ?? CHART_DOMAIN_PADDING_RATIO,
    { floor: options?.floor }
  );

  let min = paddedMin;
  let max = paddedMax;

  if (min === max) {
    const step = niceStep(Math.abs(min) || 1, tickCount);
    min -= step;
    max += step;
  }

  const step = niceStep(max - min, tickCount);
  min = snapDown(min, step);
  max = snapUp(max, step);

  if (options?.floor != null) {
    min = Math.max(options.floor, min);
  }

  if (min >= max) {
    max = min + step;
  }

  return [min, max];
}

export function niceChartTicks(domain: [number, number], tickCount = 5): number[] {
  const [min, max] = domain;
  const step = niceStep(max - min, tickCount);
  const start = snapDown(min, step);
  const ticks: number[] = [];

  for (let tick = start; tick <= max + step * 1e-9; tick += step) {
    ticks.push(step >= 1 ? Math.round(tick) : Number(tick.toPrecision(12)));
  }

  return ticks;
}

export function formatIntegerAxisValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

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
    ticks?: number[];
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
    ...(options?.ticks ? { ticks: options.ticks } : {}),
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
