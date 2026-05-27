"use client";

import { useChainSyncStatus } from "@/hooks/useChainSyncStatus";
import { useHydrated } from "@/hooks/useHydrated";
import type { ChainSummary } from "@/lib/api/types";
import { CHAIN_EXPLORERS, isChainLive } from "@/lib/chainDisplay";
import { cn, formatNumber } from "@/lib/utils";

export function SyncStatusPill({
  chainId,
  initialSummary,
}: {
  chainId: "vrm" | "vrc";
  initialSummary?: ChainSummary | null;
}) {
  const hydrated = useHydrated();
  const config = CHAIN_EXPLORERS[chainId];
  const { live, height, label: syncLabel } = useChainSyncStatus(chainId, initialSummary);
  const seedLive =
    initialSummary != null &&
    isChainLive(initialSummary.health, initialSummary.latestBlocks[0]?.height);
  const seedHeight =
    initialSummary?.health.heights.bestRpcHeight ??
    initialSummary?.health.heights.maxIndexedHeight ??
    null;
  const showLive = hydrated ? live : seedLive;
  const showHeight = hydrated ? height : seedHeight;
  const showLabel = hydrated ? syncLabel : seedLive ? "Live" : "Offline";
  const heightLabel =
    showLive && showHeight != null ? `#${formatNumber(showHeight)}` : showLabel;

  return (
    <div
      title={`${config.name} chain status`}
      aria-label={
        showLive && showHeight != null
          ? `${config.name} live at block ${showHeight}`
          : `${config.name} offline`
      }
      className={cn(
        "hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums sm:inline-flex",
        showLive
          ? "border-border bg-bg-subtle text-fg-muted"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          showLive ? "bg-success live-dot-breathe" : "bg-warning",
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        {config.ticker}
      </span>
      <span>{heightLabel}</span>
    </div>
  );
}
