"use client";

import type { TooltipContentProps } from "recharts";
import type { ChartThemeColors } from "@/hooks/useChartTheme";
import { formatChartTooltipRange } from "@/lib/chartDates";
import { cn } from "@/lib/utils";

/** Props Recharts injects at runtime when `content` is a React element. */
export type RechartsTooltipContentProps = Partial<
  Pick<TooltipContentProps<number, string>, "active" | "payload" | "label">
>;

function formatRange(startTime?: number, endTime?: number): string | null {
  if (startTime == null || endTime == null) {
    return null;
  }

  return formatChartTooltipRange(startTime, endTime);
}

export function ThemedChartTooltip({
  active,
  payload,
  label,
  colors,
  valueFormatter,
  unit,
  accentColor,
}: RechartsTooltipContentProps & {
  colors: ChartThemeColors;
  valueFormatter?: (value: number, name?: string) => string;
  unit?: string;
  accentColor?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload as { startTime?: number; endTime?: number } | undefined;
  const range = formatRange(row?.startTime, row?.endTime);
  const entries = payload.filter((item) => typeof item.value === "number");

  return (
    <div
      className={cn(
        "insights-chart-tooltip min-w-[10rem] rounded-lg border px-3.5 py-2.5 shadow-xl backdrop-blur-md",
      )}
      style={{
        background: `color-mix(in srgb, ${colors.bgPanel} 92%, transparent)`,
        borderColor: accentColor
          ? `color-mix(in srgb, ${accentColor} 35%, ${colors.border})`
          : colors.border,
        color: colors.fg,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-tight" style={{ color: colors.fg }}>
            {label}
          </p>
          {range ? (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: colors.fgSubtle }}>
              {range}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {entries.map((item, index) => {
          const swatch =
            typeof item.color === "string"
              ? item.color
              : accentColor ?? colors.accent;
          return (
            <li
              key={String(item.dataKey ?? item.name ?? index)}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.fgMuted }}>
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-1"
                  style={{
                    background: swatch,
                    boxShadow: `0 0 8px color-mix(in srgb, ${swatch} 45%, transparent)`,
                    // ring color via inline style fallback
                  }}
                />
                {item.name}
              </span>
              <span className="text-sm font-bold tabular-nums tracking-tight">
                {valueFormatter
                  ? valueFormatter(Number(item.value), String(item.name ?? ""))
                  : `${Number(item.value).toLocaleString()}${unit ? ` ${unit}` : ""}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CountChartTooltip({
  active,
  payload,
  label,
  colors,
  unit,
  accentColor,
}: RechartsTooltipContentProps & {
  colors: ChartThemeColors;
  unit: string;
  accentColor?: string;
}) {
  return (
    <ThemedChartTooltip
      active={active}
      payload={payload?.filter(
        (item) => typeof item.value === "number" && Number(item.value) > 0,
      )}
      label={label}
      colors={colors}
      unit={unit}
      accentColor={accentColor}
    />
  );
}
