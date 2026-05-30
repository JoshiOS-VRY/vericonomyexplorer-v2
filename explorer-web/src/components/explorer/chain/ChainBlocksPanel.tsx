"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcPanel, BcTableLink } from "@/components/explorer/BlockchairUi";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import { Button } from "@/components/ui/Button";
import type { IndexedBlock, Paging } from "@/lib/api/types";
import { fetchBlocksPageClient } from "@/lib/api/client";
import type { ChainId } from "@/lib/chainDisplay";
import { pickBlockPageBase } from "@/lib/chainBlocksPage";
import { formatPercent } from "@/lib/formatMarket";
import { cn, formatDifficulty } from "@/lib/utils";

const MIN_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 24;
const ROW_HEIGHT_PX = 44;
const TABLE_HEAD_PX = 41;

function BlockTableRow({
  block,
  chainId,
}: {
  block: IndexedBlock;
  chainId: ChainId;
}) {
  return (
    <tr>
      <td>
        <BcTableLink
          href={`/${chainId}/block/${block.height}`}
          className="tabular-nums"
        >
          {formatHeight(block.height)}
        </BcTableLink>
      </td>
      <td className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {formatHeight(block.txCount)}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.outputCount != null ? formatHeight(block.outputCount) : "—"}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.size != null ? formatHeight(block.size) : "—"}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.difficulty ? formatDifficulty(block.difficulty) : "—"}
      </td>
      <td className="min-w-[8rem] max-w-[14rem] truncate">
        {chainId === "vrm" ? (
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
}: {
  chainId: ChainId;
  liveBlocks: IndexedBlock[];
  chainHeight: number | null;
}) {
  const producerLabel = chainId === "vrm" ? "Extracted by" : "Interest";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(MIN_PAGE_SIZE);
  const [offset, setOffset] = useState(0);
  const [blocks, setBlocks] = useState<IndexedBlock[]>(liveBlocks);
  const [paging, setPaging] = useState<Paging>({
    limit: MIN_PAGE_SIZE,
    offset: 0,
    total: chainHeight != null ? chainHeight + 1 : liveBlocks.length,
    hasMore: false,
  });
  const [filledPage, setFilledPage] = useState<IndexedBlock[] | null>(null);
  const filledPageCount = filledPage?.length ?? 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBlocks =
    chainHeight != null
      ? chainHeight + 1
      : Math.max(paging.total, liveBlocks.length);

  const updatePageSize = useCallback((height: number) => {
    const rows = Math.floor((height - TABLE_HEAD_PX) / ROW_HEIGHT_PX);
    const next = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, rows));
    setPageSize((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    updatePageSize(element.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updatePageSize(entry.contentRect.height);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [updatePageSize]);

  useEffect(() => {
    if (offset !== 0) {
      return;
    }

    if (liveBlocks.length >= pageSize) {
      setFilledPage(null);
      setBlocks(liveBlocks.slice(0, pageSize));
      setPaging({
        limit: pageSize,
        offset: 0,
        total: totalBlocks,
        hasMore: pageSize < totalBlocks,
      });
      return;
    }

    const base = pickBlockPageBase(filledPage, liveBlocks);
    const liveByHeight = new Map(
      liveBlocks.map((block) => [block.height, block]),
    );
    const merged = base
      .slice(0, pageSize)
      .map((block) => liveByHeight.get(block.height) ?? block);

    setBlocks(merged);
    setPaging({
      limit: pageSize,
      offset: 0,
      total: totalBlocks || merged.length,
      hasMore: pageSize < (totalBlocks || merged.length),
    });
  }, [filledPage, liveBlocks, offset, pageSize, totalBlocks]);

  useEffect(() => {
    if (offset !== 0 || liveBlocks.length >= pageSize) {
      if (offset === 0 && liveBlocks.length >= pageSize) {
        setFilledPage(null);
      }
      return;
    }

    if (filledPageCount >= pageSize) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await fetchBlocksPageClient(chainId, {
          limit: pageSize,
          offset: 0,
        });
        if (cancelled) {
          return;
        }
        if (result.items.length > 0) {
          setFilledPage(result.items);
          setPaging(result.paging);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load blocks for this page.");
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
  }, [chainId, filledPageCount, liveBlocks.length, offset, pageSize]);

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
        setBlocks(result.items);
        setPaging(result.paging);
      } catch {
        if (!cancelled) {
          setError("Unable to load blocks for this page.");
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
    if (nextOffset >= paging.total) {
      return;
    }
    if (nextOffset === 0) {
      setFilledPage(null);
    }
    setOffset(nextOffset);
  };

  const rangeStart = paging.total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + blocks.length, paging.total);
  const canGoPrev = offset > 0 && !loading;
  const canGoNext = paging.hasMore && !loading;

  if (liveBlocks.length === 0 && offset === 0 && !loading) {
    return (
      <BcPanel
        title="Blocks"
        flush
        className="flex h-full min-h-[28rem] flex-col"
      >
        <p className="px-4 py-6 text-sm text-fg-muted">
          No blocks indexed yet.
        </p>
      </BcPanel>
    );
  }

  return (
    <BcPanel
      title="Blocks"
      flush
      className="flex h-full min-h-[28rem] flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {error ? (
          <p className="border-b border-border px-4 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-auto",
            loading && "pointer-events-none opacity-60",
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
                <BlockTableRow
                  key={block.hash}
                  block={block}
                  chainId={chainId}
                />
              ))}
            </tbody>
          </table>
          {loading && blocks.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading blocks…
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2.5">
          <p className="text-xs text-fg-muted">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : paging.total > 0 ? (
              <>
                {formatHeight(rangeStart)}–{formatHeight(rangeEnd)} of{" "}
                {formatHeight(paging.total)}
              </>
            ) : (
              "No blocks"
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
