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

export function chartYAxisProps(
  colors: ChartThemeColors,
  options?: {
    allowDecimals?: boolean;
    tickFormatter?: (value: number) => string;
    width?: number;
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
