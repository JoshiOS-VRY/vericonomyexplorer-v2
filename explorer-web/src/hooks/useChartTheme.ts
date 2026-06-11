'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { normalizeSvgColor } from '@/lib/resolveCssColor';

export interface ChartThemeColors {
  accent: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  bgPanel: string;
  bgSubtle: string;
  success: string;
  warning: string;
  danger: string;
}

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

function readChartThemeColors(): ChartThemeColors {
  if (typeof window === 'undefined') {
    return FALLBACK;
  }

  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => {
    const raw = style.getPropertyValue(name).trim();
    return normalizeSvgColor(raw) || fallback;
  };

  return {
    accent: pick('--accent', FALLBACK.accent),
    fg: pick('--fg', FALLBACK.fg),
    fgMuted: pick('--fg-muted', FALLBACK.fgMuted),
    fgSubtle: pick('--fg-subtle', FALLBACK.fgSubtle),
    border: pick('--border', FALLBACK.border),
    bgPanel: pick('--bg-panel', FALLBACK.bgPanel),
    bgSubtle: pick('--bg-subtle', FALLBACK.bgSubtle),
    success: pick('--success', FALLBACK.success),
    warning: pick('--warning', FALLBACK.warning),
    danger: pick('--danger', FALLBACK.danger),
  };
}

export function useChartTheme(): ChartThemeColors {
  const { resolved } = useTheme();
  const [colors, setColors] = useState<ChartThemeColors>(() => readChartThemeColors());

  const refresh = useCallback(() => {
    setColors(readChartThemeColors());
  }, []);

  useLayoutEffect(() => {
    refresh();
  }, [resolved, refresh]);

  useEffect(() => {
    refresh();
  }, [resolved, refresh]);

  return colors;
}
