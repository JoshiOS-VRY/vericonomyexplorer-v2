"use client";

import { useChainTipState } from "@/components/explorer/TipStreamProvider";
import { cn, formatNumber } from "@/lib/utils";

export function SyncStatusPill() {
  const { height, online } = useChainTipState("vrm");
  const label = online && height != null ? formatNumber(height) : "Offline";

  return (
    <div
      title="Verium chain status"
      aria-label={online && height != null ? `Verium online at block ${height}` : "Verium offline"}
      className={cn(
        "hidden items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums sm:inline-flex",
        online
          ? "border-border bg-bg-subtle text-fg-muted"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-success live-dot-breathe" : "bg-warning",
        )}
      />
      {online && height != null ? `#${label}` : label}
    </div>
  );
}
