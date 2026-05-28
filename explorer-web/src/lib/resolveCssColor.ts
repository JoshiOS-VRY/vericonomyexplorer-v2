/**
 * Resolve CSS custom properties and normalize rgb() for SVG/Recharts attributes.
 * SVG presentation attributes require comma-separated rgb(), not modern space syntax.
 */
export function normalizeSvgColor(value: string): string {
  if (!value) return value;

  const rgbMatch = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    if (a != null) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  return value;
}

export function resolveCssColor(value: string, element: Element | null = null): string {
  if (typeof window === "undefined") {
    return normalizeSvgColor(value);
  }

  if (!value.startsWith("var(")) {
    return normalizeSvgColor(value);
  }

  const match = value.match(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/);
  if (!match) {
    return normalizeSvgColor(value);
  }

  const target = element ?? document.documentElement;
  const resolved = getComputedStyle(target).getPropertyValue(match[1]).trim();
  return normalizeSvgColor(resolved || match[2]?.trim() || value);
}

export function getChainChartColor(chainId: "vrm" | "vrc"): string {
  const fallbacks = {
    vrm: "rgb(70, 80, 90)",
    vrc: "rgb(65, 139, 202)",
  };

  if (typeof window === "undefined") {
    return fallbacks[chainId];
  }

  const cssVar = chainId === "vrm" ? "--chain-vrm" : "--chain-vrc";
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return normalizeSvgColor(resolved) || fallbacks[chainId];
}
