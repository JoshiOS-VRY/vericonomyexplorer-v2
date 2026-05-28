"use client";

import { BcPanel } from "@/components/explorer/BlockchairUi";
import { AddressChartSkeleton } from "@/components/explorer/address/AddressSectionSkeleton";
import { cn } from "@/lib/utils";

export function InsightsChartPanel({
  title,
  action,
  loading,
  error,
  empty,
  footer,
  children,
  className,
  chainId,
}: {
  title: string;
  action?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: string | null;
  footer?: string | null;
  children?: React.ReactNode;
  className?: string;
  chainId?: "vrm" | "vrc";
}) {
  return (
    <BcPanel
      title={title}
      action={action}
      className={cn(
        "insights-chart-panel overflow-visible!",
        chainId === "vrm" && "insights-chart-panel-vrm",
        chainId === "vrc" && "insights-chart-panel-vrc",
        className,
      )}
    >
      {error ? (
        <p className="mb-3 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {loading && !children ? (
        <AddressChartSkeleton />
      ) : empty ? (
        <div className="insights-chart-empty flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-bg-subtle/40 px-6 py-10 text-center">
          <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{empty}</p>
        </div>
      ) : (
        <div
          className={cn(
            "overflow-visible transition-opacity duration-300",
            loading && "pointer-events-none opacity-70",
          )}
        >
          {children}
        </div>
      )}
      {footer ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {footer.split(" · ").map((part, index) => (
            <span
              key={`${part}-${index}`}
              className="inline-flex items-center rounded-full bg-bg-subtle px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-subtle"
            >
              {part}
            </span>
          ))}
        </div>
      ) : null}
    </BcPanel>
  );
}
