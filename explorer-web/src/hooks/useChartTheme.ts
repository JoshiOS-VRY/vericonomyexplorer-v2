"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";

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

function readChartThemeColors(): ChartThemeColors {
  const style = getComputedStyle(document.documentElement);

  const pick = (name: string) => style.getPropertyValue(name).trim();

  return {
    accent: pick("--accent"),
    fg: pick("--fg"),
    fgMuted: pick("--fg-muted"),
    fgSubtle: pick("--fg-subtle"),
    border: pick("--border"),
    bgPanel: pick("--bg-panel"),
    bgSubtle: pick("--bg-subtle"),
    success: pick("--success"),
    warning: pick("--warning"),
    danger: pick("--danger"),
  };
}

const emptyColors: ChartThemeColors = {
  accent: "",
  fg: "",
  fgMuted: "",
  fgSubtle: "",
  border: "",
  bgPanel: "",
  bgSubtle: "",
  success: "",
  warning: "",
  danger: "",
};

export function useChartTheme(): ChartThemeColors {
  const { resolved } = useTheme();
  const [colors, setColors] = useState<ChartThemeColors>(emptyColors);

  const refresh = useCallback(() => {
    setColors(readChartThemeColors());
  }, []);

  useEffect(() => {
    refresh();
  }, [resolved, refresh]);

  return colors;
}
