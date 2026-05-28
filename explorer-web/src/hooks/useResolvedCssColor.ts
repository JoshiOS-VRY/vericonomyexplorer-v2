"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { normalizeSvgColor, resolveCssColor } from "@/lib/resolveCssColor";

export function useResolvedCssColor(value: string): string {
  const { resolved: theme } = useTheme();
  const [color, setColor] = useState(() => normalizeSvgColor(value));

  const refresh = useCallback(() => {
    setColor(resolveCssColor(value));
  }, [value]);

  useEffect(() => {
    refresh();
  }, [refresh, theme]);

  return color;
}
