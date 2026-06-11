'use client';

import { useChainSyncStatus } from '@/hooks/useChainSyncStatus';
import { useHydrated } from '@/hooks/useHydrated';
import type { ChainSummary } from '@/lib/api/types';
import { CHAIN_EXPLORERS, isChainLive } from '@/lib/chainDisplay';
import { cn, formatNumber } from '@/lib/utils';

export function SyncStatusPill({
  chainId,
  initialSummary,
}: {
  chainId: 'vrm' | 'vrc';
  initialSummary?: ChainSummary | null;
}) {
  const hydrated = useHydrated();
  const config = CHAIN_EXPLORERS[chainId];
  const { live, height, label: syncLabel, loading } = useChainSyncStatus(chainId, initialSummary);
  const seedLive =
    initialSummary != null &&
    isChainLive(initialSummary.health, initialSummary.latestBlocks[0]?.height);
  const seedHeight =
    initialSummary?.health.heights.bestRpcHeight ??
    initialSummary?.health.heights.maxIndexedHeight ??
    null;
  const isLoading = hydrated ? loading : initialSummary == null;
  const showLive = !isLoading && (hydrated ? live : seedLive);
  const showHeight = !isLoading ? (hydrated ? height : seedHeight) : null;
  const showLabel = isLoading ? null : hydrated ? syncLabel : seedLive ? 'Live' : 'Offline';
  const heightLabel = isLoading
    ? '…'
    : showLive && showHeight != null
      ? `#${formatNumber(showHeight)}`
      : (showLabel ?? 'Offline');

  return (
    <div
      title={isLoading ? `${config.name} status loading` : `${config.name} chain status`}
      role="status"
      aria-busy={isLoading}
      aria-live="polite"
      aria-label={
        isLoading
          ? `${config.name} status loading`
          : showLive && showHeight != null
            ? `${config.name} live at block ${showHeight}`
            : `${config.name} offline`
      }
      className={cn(
        'hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums sm:inline-flex',
        isLoading || showLive
          ? 'border-border bg-bg-subtle text-fg-muted'
          : 'border-warning/40 bg-warning/10 text-warning'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          isLoading
            ? 'animate-pulse bg-fg-subtle'
            : showLive
              ? 'bg-success live-dot-breathe'
              : 'bg-warning'
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        {config.ticker}
      </span>
      <span className={cn(isLoading && 'animate-pulse')}>{heightLabel}</span>
    </div>
  );
}
