"use client";

import { useChainSyncStatus } from "@/hooks/useChainSyncStatus";
import type { ChainSummary } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { cn, formatNumber } from "@/lib/utils";

export function SyncStatusPill({
  chainId,
  initialSummary,
}: {
  chainId: "vrm" | "vrc";
  initialSummary?: ChainSummary | null;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const { live, height, label: syncLabel } = useChainSyncStatus(chainId, initialSummary);
  const heightLabel =
    live && height != null ? `#${formatNumber(height)}` : syncLabel;

  return (
    <div
      title={`${config.name} chain status`}
      aria-label={
        live && height != null
          ? `${config.name} live at block ${height}`
          : `${config.name} offline`
      }
      className={cn(
        "hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums sm:inline-flex",
        live
          ? "border-border bg-bg-subtle text-fg-muted"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          live ? "bg-success live-dot-breathe" : "bg-warning",
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        {config.ticker}
      </span>
      <span>{heightLabel}</span>
    </div>
  );
}
