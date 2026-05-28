export const CHART_MARGINS = { top: 16, right: 16, left: 8, bottom: 24 };

export function formatCompactAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(2);
  if (abs >= 0.01) return value.toFixed(4);
  return value.toExponential(2);
}

export function gradientId(baseId: string, suffix: string): string {
  return `${baseId}-${suffix}`.replace(/[^a-zA-Z0-9-_]/g, "");
}

export const CHART_ANIMATION = {
  duration: 500,
  easing: "ease-out" as const,
};

export const ACTIVITY_SERIES = [
  { key: "mined", label: "Mined", token: "success" as const },
  { key: "staked", label: "Staked", token: "warning" as const },
  { key: "received", label: "Transfers", token: "accent" as const },
];
