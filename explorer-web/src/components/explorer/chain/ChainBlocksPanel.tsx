'use client';

import { ChevronLeft, ChevronRight, Loader2, Radio } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { BcPanel, BcTableLink } from '@/components/explorer/BlockchairUi';
import { ExtractedByCell } from '@/components/explorer/block/ExtractedByCell';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import { Button } from '@/components/ui/Button';
import { useBlocksPanelPageSize } from '@/hooks/useBlocksPanelPageSize';
import { useLatestBlocksPoll } from '@/hooks/useLatestBlocksPoll';
import type { IndexedBlock, Paging } from '@/lib/api/types';
import { fetchBlocksPageClient } from '@/lib/api/client';
import { CHAIN_BLOCKS_PANEL_MAX_ROWS, CHAIN_BLOCKS_PANEL_MIN_ROWS } from '@/lib/chainBlocksDisplay';
import type { ChainId } from '@/lib/chainDisplay';
import { formatPercent } from '@/lib/formatMarket';
import { cn, formatDifficulty } from '@/lib/utils';

function BlockTableRow({ block, chainId }: { block: IndexedBlock; chainId: ChainId }) {
  return (
    <tr>
      <td>
        <BcTableLink href={`/${chainId}/block/${block.height}`} className="tabular-nums">
          {formatHeight(block.height)}
        </BcTableLink>
      </td>
      <td className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td className="text-right tabular-nums text-fg-muted">{formatHeight(block.txCount)}</td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.outputCount != null ? formatHeight(block.outputCount) : '—'}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.size != null ? formatHeight(block.size) : '—'}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.difficulty ? formatDifficulty(block.difficulty) : '—'}
      </td>
      <td className="min-w-[8rem] max-w-[14rem] truncate">
        {chainId === 'vrm' ? (
          <ExtractedByCell
            block={block}
            chainId={chainId}
            className="block truncate text-sm font-medium text-accent hover:underline"
          />
        ) : (
          <span className="text-sm tabular-nums text-fg-muted">
            {formatPercent(block.interestRatePercent)}
          </span>
        )}
      </td>
    </tr>
  );
}

export function ChainBlocksPanel({
  chainId,
  liveBlocks,
  chainHeight,
  maxIndexedHeight,
}: {
  chainId: ChainId;
  liveBlocks: IndexedBlock[];
  chainHeight: number | null;
  maxIndexedHeight?: number | null;
}) {
  const panelBodyRef = useRef<HTMLDivElement>(null);
  const pageSize = useBlocksPanelPageSize(panelBodyRef);
  const producerLabel = chainId === 'vrm' ? 'Extracted by' : 'Interest';
  const behindTip =
    chainHeight != null && maxIndexedHeight != null && chainHeight - maxIndexedHeight > pageSize;

  const {
    blocks: polledBlocks,
    isRefreshing: isPolling,
    error: pollError,
  } = useLatestBlocksPoll(chainId, liveBlocks, chainHeight, CHAIN_BLOCKS_PANEL_MAX_ROWS);

  const [offset, setOffset] = useState(0);
  const [pagedBlocks, setPagedBlocks] = useState<IndexedBlock[]>([]);
  const [paging, setPaging] = useState<Paging>({
    limit: CHAIN_BLOCKS_PANEL_MIN_ROWS,
    offset: 0,
    total: chainHeight != null ? chainHeight + 1 : liveBlocks.length,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBlocks =
    chainHeight != null
      ? chainHeight + 1
      : Math.max(paging.total, polledBlocks.length, liveBlocks.length);

  useEffect(() => {
    setOffset(0);
  }, [pageSize]);

  const livePageBlocks = useMemo(() => {
    const source = polledBlocks.length > 0 ? polledBlocks : liveBlocks;
    return source.slice(0, pageSize);
  }, [liveBlocks, pageSize, polledBlocks]);

  const livePaging = useMemo<Paging>(
    () => ({
      limit: pageSize,
      offset: 0,
      total: totalBlocks,
      hasMore: pageSize < totalBlocks,
    }),
    [pageSize, totalBlocks]
  );

  const blocks = offset === 0 ? livePageBlocks : pagedBlocks;
  const activePaging = offset === 0 ? livePaging : paging;

  useEffect(() => {
    if (offset === 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await fetchBlocksPageClient(chainId, {
          limit: pageSize,
          offset,
        });
        if (cancelled) {
          return;
        }
        setPagedBlocks(result.items);
        setPaging(result.paging);
      } catch {
        if (!cancelled) {
          setError('Unable to load blocks for this page.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chainId, offset, pageSize]);

  const goToOffset = (nextOffset: number) => {
    if (loading || nextOffset < 0 || nextOffset === offset) {
      return;
    }
    if (nextOffset >= activePaging.total) {
      return;
    }
    setOffset(nextOffset);
  };

  const rangeStart = activePaging.total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + blocks.length, activePaging.total);
  const canGoPrev = offset > 0 && !loading;
  const canGoNext = activePaging.hasMore && !loading;
  const displayError = error ?? (offset === 0 ? pollError : null);
  const isLivePage = offset === 0 && !behindTip;
  const showLoading = loading || (isLivePage && isPolling && blocks.length === 0);

  if (liveBlocks.length === 0 && offset === 0 && !showLoading) {
    return (
      <BcPanel title="Blocks" flush className="flex h-full min-h-[28rem] flex-col">
        <p className="px-4 py-6 text-sm text-fg-muted">No blocks indexed yet.</p>
      </BcPanel>
    );
  }

  return (
    <BcPanel
      title="Blocks"
      flush
      className="flex h-full min-h-[28rem] flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
      action={
        isLivePage ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
            <Radio className={cn('h-3 w-3', isPolling && 'animate-pulse')} aria-hidden />
            Live
          </span>
        ) : null
      }
    >
      <div ref={panelBodyRef} className="flex min-h-0 flex-1 flex-col">
        {behindTip ? (
          <p className="border-b border-border bg-bg-subtle px-4 py-2 text-xs text-fg-muted">
            Indexer is {formatHeight((chainHeight ?? 0) - (maxIndexedHeight ?? 0))} blocks behind.
            Showing the latest blocks from the live node; older blocks appear once syncing
            completes.
          </p>
        ) : null}
        {displayError ? (
          <p className="border-b border-border px-4 py-2 text-sm text-danger">{displayError}</p>
        ) : null}
        <div
          data-blocks-panel-scroll
          className={cn(
            'min-h-0 flex-1 overflow-auto',
            showLoading && 'pointer-events-none opacity-60'
          )}
        >
          <table className="bc-table">
            <thead className="sticky top-0 z-10 bg-bg-subtle shadow-[0_1px_0_var(--border)]">
              <tr>
                <th>Height</th>
                <th className="bc-col-age">Time</th>
                <th className="text-right">Txs</th>
                <th className="text-right">Out</th>
                <th className="text-right">Size</th>
                <th className="text-right">Difficulty</th>
                <th>{producerLabel}</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <BlockTableRow key={block.hash} block={block} chainId={chainId} />
              ))}
            </tbody>
          </table>
          {showLoading && blocks.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading blocks…
            </div>
          ) : null}
        </div>

        <div
          data-blocks-panel-footer
          className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2.5"
        >
          <p className="text-xs text-fg-muted">
            {showLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : activePaging.total > 0 ? (
              <>
                {formatHeight(rangeStart)}–{formatHeight(rangeEnd)} of{' '}
                {formatHeight(activePaging.total)}
              </>
            ) : (
              'No blocks'
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoPrev}
              aria-label="Previous blocks page"
              onClick={() => goToOffset(Math.max(0, offset - pageSize))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoNext}
              aria-label="Next blocks page"
              onClick={() => goToOffset(offset + pageSize)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </BcPanel>
  );
}
