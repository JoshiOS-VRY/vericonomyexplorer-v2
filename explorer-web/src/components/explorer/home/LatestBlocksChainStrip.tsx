'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Blocks, ChevronRight, Radio } from 'lucide-react';
import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { BcTableLink } from '@/components/explorer/BlockchairUi';
import { ExtractedByCell } from '@/components/explorer/block/ExtractedByCell';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import { ChainMarketCard } from '@/components/explorer/home/ChainMarketCard';
import { ChainNetworkCard } from '@/components/explorer/home/ChainNetworkCard';
import { ChainHubStatCell, ChainHubStatRow } from '@/components/explorer/home/ChainHubStats';
import { useLatestBlocksPoll } from '@/hooks/useLatestBlocksPoll';
import type {
  ChainMarket,
  ChainSummary,
  IndexedBlock,
  VrcNetworkStats,
  VrmNetworkStats,
} from '@/lib/api/types';
import {
  LATEST_BLOCKS_COUNT,
  LATEST_BLOCKS_STRIP_COUNT,
} from '@/lib/chainBlocksDisplay';
import {
  CHAIN_EXPLORERS,
  CHAIN_THEME,
  getChainTipHeight,
  isChainAtTip,
  type ChainId,
} from '@/lib/chainDisplay';
import { isOptimisticTipBlock } from '@/lib/liveBlocksMerge';
import { formatPercent } from '@/lib/formatMarket';
import { isVeriumPoolExtracted } from '@/lib/veriumPoolExtracted';
import { cn, formatDifficulty } from '@/lib/utils';

export interface ChainHubSectionProps {
  chainId: ChainId;
  summary: ChainSummary;
  chainHeight: number | null;
  heightPulse: boolean;
  market: ChainMarket;
  network: VrmNetworkStats | VrcNetworkStats;
  /** Seed blocks from the live store (optimistic tips, SSR). */
  seedBlocks: IndexedBlock[];
}

/** Chain hub: latest blocks first, then compact stats and market/network. */
export function ChainHubSection({
  chainId,
  summary,
  chainHeight,
  heightPulse,
  market,
  network,
  seedBlocks,
}: ChainHubSectionProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const health = summary.health;
  const {
    blocks: displayBlocks,
    isRefreshing,
    error: blocksError,
  } = useLatestBlocksPoll(chainId, seedBlocks, chainHeight);

  const tipBlock = displayBlocks[0];
  const atTip = isChainAtTip(health, tipBlock?.height, chainHeight);
  const displayHeight = chainHeight ?? getChainTipHeight(health);
  const stripBlocks = [...displayBlocks.slice(0, LATEST_BLOCKS_STRIP_COUNT)].reverse();
  const tableRows = displayBlocks.slice(0, LATEST_BLOCKS_COUNT);
  const producerColumnLabel = chainId === 'vrm' ? 'Extracted by' : 'Interest';

  return (
    <section
      className={cn(
        'chain-hub-section block-chain-section flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm',
        'chain-hub-section--accent'
      )}
      data-chain={chainId}
      style={
        {
          '--block-chain-accent': theme.accent,
          '--block-chain-accent-soft': theme.accentSoft,
          '--block-strip-columns': LATEST_BLOCKS_STRIP_COUNT,
        } as React.CSSProperties
      }
    >
      <div className="chain-hub-section__identity flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="chain-hub-section__logo-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-bg-subtle/60">
            <Image
              src={config.logo}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-fg sm:text-lg">
                {config.name}
              </h2>
              <span className="chain-hub-section__ticker rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                {config.ticker}
              </span>
              <span className="text-xs text-fg-subtle">{config.consensus}</span>
            </div>
          </div>
        </div>
        {config.exploreHref ? (
          <Link
            href={config.exploreHref}
            prefetch
            className={cn(
              'chain-explore-btn shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm',
              chainId === 'vrm' ? 'chain-explore-btn-vrm' : 'chain-explore-btn-vrc'
            )}
          >
            <span className="inline-flex items-center gap-1">
              Explore
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : (
          <span className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-subtle">
            Stats live
          </span>
        )}
      </div>

      <div className="chain-hub-section__blocks chain-hub-section__blocks--hero min-h-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-fg-subtle">
              Latest blocks
            </h4>
            <span className="chain-hub-blocks-live inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
              <Radio
                className={cn('h-2.5 w-2.5', isRefreshing && 'animate-pulse')}
                aria-hidden
              />
              Live
            </span>
          </div>
          {config.exploreHref ? (
            <Link
              href={config.exploreHref}
              prefetch
              className="text-xs font-semibold text-accent hover:underline"
            >
              View all
            </Link>
          ) : null}
        </header>

        {blocksError ? (
          <p className="border-b border-border px-4 py-2 text-xs text-danger sm:px-5">
            {blocksError}
          </p>
        ) : null}

        {tableRows.length === 0 ? (
          <div className="chain-hub-blocks-empty flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
            <Blocks className="h-8 w-8 text-fg-subtle/50" aria-hidden />
            <p className="mt-3 text-sm font-medium text-fg-muted">No blocks indexed yet</p>
            <p className="mt-1 text-xs text-fg-subtle">
              Blocks will appear here as the chain syncs.
            </p>
          </div>
        ) : (
          <>
            {stripBlocks.length > 0 ? (
              <BlockTimelineStrip
                blocks={stripBlocks}
                ticker={config.ticker}
                atTip={atTip}
                chainId={chainId}
                blockHref={(height) => config.blockHref?.(height)}
              />
            ) : null}

            <div className="block-chain-table-mobile-list space-y-0 divide-y divide-border sm:hidden">
              {tableRows.map((block, index) => (
                <BlockChainMobileCard
                  key={block.hash}
                  block={block}
                  chainId={chainId}
                  producerColumnLabel={producerColumnLabel}
                  blockHref={config.blockHref?.(block.height)}
                  isNewest={index === 0}
                />
              ))}
            </div>

            <div className="block-chain-table-wrap hidden overflow-x-auto sm:block">
              <table
                className="bc-table bc-table-fixed block-chain-table"
                aria-describedby={`${chainId}-latest-blocks-caption`}
              >
                <caption id={`${chainId}-latest-blocks-caption`} className="sr-only">
                  Latest {tableRows.length} {config.ticker} blocks with hash, producer, mined
                  time, transactions, size, and difficulty.
                </caption>
                <colgroup>
                  <col className="block-chain-table__col--height" />
                  <col className="block-chain-table__col--hash" />
                  <col className="block-chain-table__col--producer" />
                  <col className="block-chain-table__col--age" />
                  <col className="block-chain-table__col--txs" />
                  <col className="block-chain-table__col--size" />
                  <col className="block-chain-table__col--diff" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="block-chain-table__col block-chain-table__col--height">
                      Height
                    </th>
                    <th className="block-chain-table__col block-chain-table__col--hash">Hash</th>
                    <th className="block-chain-table__col block-chain-table__col--producer">
                      {producerColumnLabel}
                    </th>
                    <th className="block-chain-table__col block-chain-table__col--age bc-col-age">
                      Mined
                    </th>
                    <th className="block-chain-table__col block-chain-table__col--txs text-right">
                      Txs
                    </th>
                    <th className="block-chain-table__col block-chain-table__col--size text-right">
                      Size
                    </th>
                    <th className="block-chain-table__col block-chain-table__col--diff text-right">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((block, index) => (
                    <BlockChainTableRow
                      key={block.hash}
                      block={block}
                      chainId={chainId}
                      blockHref={config.blockHref?.(block.height)}
                      isNewest={index === 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ChainHubStatRow cols={3} className="chain-hub-quick-stats shrink-0 border-y border-border">
        <ChainHubStatCell
          label="Height"
          value={formatHeight(displayHeight)}
          numericValue={displayHeight ?? undefined}
          animated
          pulse={heightPulse}
        />
        <ChainHubStatCell
          label="Addresses"
          value={formatHeight(health.counts.addressCount)}
          numericValue={health.counts.addressCount}
          animated
        />
        <ChainHubStatCell
          label="Latest"
          value={
            tipBlock ? (
              <LiveRelativeTime time={tipBlock.time} interval="second" className="truncate" />
            ) : (
              '—'
            )
          }
        />
      </ChainHubStatRow>

      <div className="chain-hub-section__metrics shrink-0">
        <ChainMarketCard chainId={chainId} market={market} embedded animated hubLayout />
        <ChainNetworkCard chainId={chainId} network={network} embedded animated hubLayout />
      </div>
    </section>
  );
}

function BlockTimelineStrip({
  blocks,
  ticker,
  atTip,
  chainId,
  blockHref,
}: {
  blocks: IndexedBlock[];
  ticker: string;
  atTip: boolean;
  chainId: ChainId;
  blockHref: (height: number) => string | undefined;
}) {
  return (
    <div
      className="block-timeline hidden border-b border-border sm:block"
      aria-label={`Latest ${blocks.length} ${ticker} blocks, oldest to newest`}
    >
      <div className="block-timeline__meta">
        <span>Older</span>
        <span className="block-timeline__meta-line" aria-hidden />
        <span>Newest</span>
      </div>
      <div className="block-timeline__cells">
        {blocks.map((block, index) => (
          <BlockTimelineCell
            key={block.hash}
            block={block}
            href={blockHref(block.height)}
            isTip={index === blocks.length - 1}
            tipLive={atTip && index === blocks.length - 1}
            indexing={index === blocks.length - 1 && isOptimisticTipBlock(block, chainId)}
            recency={blocks.length > 1 ? index / (blocks.length - 1) : 1}
          />
        ))}
      </div>
    </div>
  );
}

function BlockTimelineCell({
  block,
  href,
  isTip,
  tipLive = false,
  indexing = false,
  recency,
}: {
  block: IndexedBlock;
  href?: string;
  isTip: boolean;
  tipLive?: boolean;
  indexing?: boolean;
  recency: number;
}) {
  const label = `#${formatHeight(block.height)}`;
  const meta = indexing ? (
    'Indexing…'
  ) : (
    <>
      {formatHeight(block.txCount)} tx ·{' '}
      <LiveRelativeTime time={block.time} interval="second" className="inline" />
    </>
  );

  const content = (
    <>
      <span
        className={cn(
          'block-timeline__dot',
          isTip && 'block-timeline__dot--tip',
          tipLive && 'block-timeline__dot--live',
          indexing && 'block-timeline__dot--indexing'
        )}
        aria-hidden
      />
      <span className={cn('block-timeline__height tabular-nums', isTip && 'block-timeline__height--tip')}>
        {label}
      </span>
      <span className="block-timeline__meta-cell tabular-nums">{meta}</span>
    </>
  );

  return (
    <div
      className="block-timeline__cell"
      style={{ opacity: `calc(0.55 + ${recency} * 0.45)` }}
    >
      {href ? (
        <Link href={href} prefetch className="block-timeline__link" title={label}>
          {content}
        </Link>
      ) : (
        <div className="block-timeline__link">{content}</div>
      )}
    </div>
  );
}

function BlockChainMobileCard({
  block,
  chainId,
  producerColumnLabel,
  blockHref,
  isNewest = false,
}: {
  block: IndexedBlock;
  chainId: ChainId;
  producerColumnLabel: string;
  blockHref?: string;
  isNewest?: boolean;
}) {
  const hashShort = formatBlockHashShort(block.hash);
  const indexing = isOptimisticTipBlock(block, chainId);
  const sizePending = indexing && block.size == null;
  const difficultyPending = indexing && !block.difficulty;

  return (
    <article
      className={cn(
        'block-chain-mobile-card',
        isNewest && 'block-chain-mobile-card--latest',
        indexing && 'block-chain-mobile-card--indexing'
      )}
      aria-busy={indexing}
    >
      <div className="block-chain-mobile-card__head">
        <div className="block-chain-mobile-card__height">
          <span className="block-chain-mobile-card__label">Height</span>
          {blockHref ? (
            <BcTableLink href={blockHref} className="tabular-nums" prefetch>
              {formatHeight(block.height)}
            </BcTableLink>
          ) : (
            <span className="tabular-nums text-fg">{formatHeight(block.height)}</span>
          )}
        </div>
        <div className="text-right">
          <span className="block-chain-mobile-card__label">Mined</span>
          <div className="text-sm text-fg-muted">
            <LiveRelativeTime time={block.time} interval="second" fixedWidth />
          </div>
        </div>
      </div>

      <div className="block-chain-mobile-card__row">
        <span className="block-chain-mobile-card__label">Hash</span>
        {blockHref ? (
          <BcTableLink
            href={blockHref}
            className="block-chain-table__hash-link tabular-nums"
            prefetch
            title={block.hash}
          >
            {hashShort}
          </BcTableLink>
        ) : (
          <span
            className="block-chain-table__hash-link tabular-nums text-fg-muted"
            title={block.hash}
          >
            {hashShort}
          </span>
        )}
      </div>

      <div className="block-chain-mobile-card__row">
        <span className="block-chain-mobile-card__label">{producerColumnLabel}</span>
        <div className="min-w-0">
          {chainId === 'vrm' ? (
            indexing ? (
              <BlockFieldLoading label="Extracted by" />
            ) : (
              <ExtractedByCell
                block={block}
                chainId={chainId}
                className={
                  isVeriumPoolExtracted(block)
                    ? undefined
                    : 'block-chain-table__producer-text text-sm font-medium text-[var(--chain-vrm)] hover:underline'
                }
              />
            )
          ) : indexing ? (
            <BlockFieldLoading label="Interest" />
          ) : (
            <span className="block-chain-table__producer-text text-sm tabular-nums text-fg-muted">
              {formatPercent(block.interestRatePercent)}
            </span>
          )}
        </div>
      </div>

      <div className="block-chain-mobile-card__metrics">
        <div>
          <span className="block-chain-mobile-card__label">Txs</span>
          <div className="tabular-nums">{formatHeight(block.txCount)}</div>
        </div>
        <div>
          <span className="block-chain-mobile-card__label">Size</span>
          <div className="tabular-nums">
            {block.size != null ? (
              `${formatHeight(block.size)} B`
            ) : sizePending ? (
              <BlockFieldLoading />
            ) : (
              '—'
            )}
          </div>
        </div>
        <div>
          <span className="block-chain-mobile-card__label">Difficulty</span>
          <div className="tabular-nums">
            {block.difficulty ? (
              formatDifficultyForChain(chainId, block.difficulty)
            ) : difficultyPending ? (
              <BlockFieldLoading />
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function BlockChainTableRow({
  block,
  chainId,
  blockHref,
  isNewest = false,
}: {
  block: IndexedBlock;
  chainId: ChainId;
  blockHref?: string;
  isNewest?: boolean;
}) {
  const hashShort = formatBlockHashShort(block.hash);
  const indexing = isOptimisticTipBlock(block, chainId);
  const sizePending = indexing && block.size == null;
  const difficultyPending = indexing && !block.difficulty;

  return (
    <tr
      className={cn(
        'block-chain-table-row',
        isNewest && 'block-chain-table-row--latest',
        indexing && 'block-chain-table-row--indexing'
      )}
      aria-busy={indexing}
    >
      <td
        data-label="Height"
        className="block-chain-table__col block-chain-table__col--height block-chain-table__cell-clip"
      >
        <div className="block-chain-table__height-cell">
          {blockHref ? (
            <BcTableLink href={blockHref} className="tabular-nums" prefetch>
              {formatHeight(block.height)}
            </BcTableLink>
          ) : (
            <span className="tabular-nums text-fg">{formatHeight(block.height)}</span>
          )}
        </div>
      </td>
      <td
        data-label="Hash"
        className="block-chain-table__col block-chain-table__col--hash block-chain-table__cell-clip"
      >
        {blockHref ? (
          <BcTableLink
            href={blockHref}
            className="block-chain-table__hash-link tabular-nums"
            prefetch
            title={block.hash}
          >
            {hashShort}
          </BcTableLink>
        ) : (
          <span
            className="block-chain-table__hash-link tabular-nums text-fg-muted"
            title={block.hash}
          >
            {hashShort}
          </span>
        )}
      </td>
      <td
        data-label={chainId === 'vrm' ? 'Extracted by' : 'Interest'}
        className="block-chain-table__col block-chain-table__col--producer"
      >
        <div className="block-chain-table__producer-inner">
          {chainId === 'vrm' ? (
            indexing ? (
              <BlockFieldLoading label="Extracted by" />
            ) : (
              <ExtractedByCell
                block={block}
                chainId={chainId}
                className={
                  isVeriumPoolExtracted(block)
                    ? undefined
                    : 'block-chain-table__producer-text text-sm font-medium text-[var(--chain-vrm)] hover:underline'
                }
              />
            )
          ) : indexing ? (
            <BlockFieldLoading label="Interest" />
          ) : (
            <span className="block-chain-table__producer-text text-sm tabular-nums text-fg-muted">
              {formatPercent(block.interestRatePercent)}
            </span>
          )}
        </div>
      </td>
      <td
        data-label="Mined"
        className="block-chain-table__col block-chain-table__col--age text-fg-muted"
      >
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td
        data-label="Txs"
        className="block-chain-table__col block-chain-table__col--txs text-right tabular-nums text-fg-muted"
      >
        {formatHeight(block.txCount)}
      </td>
      <td
        data-label="Size"
        className="block-chain-table__col block-chain-table__col--size text-right tabular-nums text-fg-muted"
      >
        {block.size != null ? (
          `${formatHeight(block.size)} B`
        ) : sizePending ? (
          <BlockFieldLoading align="right" />
        ) : (
          '—'
        )}
      </td>
      <td
        data-label="Difficulty"
        className="block-chain-table__col block-chain-table__col--diff text-right tabular-nums text-fg-muted"
      >
        {block.difficulty ? (
          formatDifficultyForChain(chainId, block.difficulty)
        ) : difficultyPending ? (
          <BlockFieldLoading align="right" />
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}

function BlockFieldLoading({
  label,
  align = 'left',
}: {
  label?: string;
  align?: 'left' | 'right';
}) {
  return (
    <span
      className={cn('inline-flex items-center', align === 'right' && 'ml-auto')}
      role="status"
      aria-label={label ? `${label} loading` : 'Loading'}
    >
      <span className="block-field-loading" />
    </span>
  );
}

function formatBlockHashShort(hash: string): string {
  const h = hash.replace(/^0x/i, '');
  if (h.length <= 20) return h;
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

function formatDifficultyForChain(
  chainId: ChainId,
  value: string | number | null | undefined
): string {
  if (chainId !== 'vrm') return formatDifficulty(value);
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return formatDifficulty(value);
  return n.toFixed(7);
}
