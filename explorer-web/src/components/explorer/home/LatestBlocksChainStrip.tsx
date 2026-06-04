"use client";

import Image from "next/image";
import Link from "next/link";
import { Blocks, ChevronRight, ExternalLink, Radio } from "lucide-react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcTableLink } from "@/components/explorer/BlockchairUi";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import {
  ChainHubStatCell,
  ChainHubStatRow,
} from "@/components/explorer/home/ChainHubStats";
import { useLatestBlocksPoll } from "@/hooks/useLatestBlocksPoll";
import type {
  ChainMarket,
  ChainSummary,
  IndexedBlock,
  VrcNetworkStats,
  VrmNetworkStats,
} from "@/lib/api/types";
import {
  LATEST_BLOCKS_COUNT,
  LATEST_BLOCKS_POLL_MS,
  LATEST_BLOCKS_STRIP_COUNT,
} from "@/lib/chainBlocksDisplay";
import {
  CHAIN_EXPLORERS,
  CHAIN_THEME,
  getChainTipHeight,
  isChainAtTip,
  type ChainId,
} from "@/lib/chainDisplay";
import {
  isIndexedBlockTableReady,
  isOptimisticTipBlock,
} from "@/lib/liveBlocksMerge";
import { formatPercent } from "@/lib/formatMarket";
import { cn, formatDifficulty } from "@/lib/utils";

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
  const stripBlocks = [
    ...displayBlocks.slice(0, LATEST_BLOCKS_STRIP_COUNT),
  ].reverse();
  const tableRows = displayBlocks.slice(0, LATEST_BLOCKS_COUNT);
  const producerColumnLabel = chainId === "vrm" ? "Extracted by" : "Interest";

  return (
    <section
      className={cn(
        "chain-hub-section block-chain-section flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm",
        "chain-hub-section--accent",
      )}
      data-chain={chainId}
      style={
        {
          "--block-chain-accent": theme.accent,
          "--block-chain-accent-soft": theme.accentSoft,
          "--block-strip-columns": LATEST_BLOCKS_STRIP_COUNT,
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
              "chain-explore-btn shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm",
              chainId === "vrm"
                ? "chain-explore-btn-vrm"
                : "chain-explore-btn-vrc",
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
        <header className="chain-hub-blocks-head flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="chain-hub-blocks-head__icon flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-bg-subtle/50">
              <Blocks className="h-4 w-4 text-fg-muted" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-fg sm:text-lg">
                  Latest blocks
                </h3>
                <span className="chain-hub-blocks-live inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  <Radio
                    className={cn("h-2.5 w-2.5", isRefreshing && "animate-pulse")}
                    aria-hidden
                  />
                  Live
                </span>
              </div>
              <p className="text-xs text-fg-subtle">
                {tableRows.length > 0
                  ? tipBlock && !isIndexedBlockTableReady(tipBlock, chainId)
                    ? `${tableRows.length} most recent · indexing new block…`
                    : `${tableRows.length} most recent · updates every ${LATEST_BLOCKS_POLL_MS / 1000}s`
                  : "Loading recent blocks…"}
              </p>
            </div>
          </div>
          {config.exploreHref ? (
            <Link
              href={config.exploreHref}
              className={cn(
                "chain-hub-blocks-head__link inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold transition-colors",
                chainId === "vrm"
                  ? "text-[var(--chain-vrm)]"
                  : "text-[var(--chain-vrc)]",
              )}
            >
              View all
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
            </Link>
          ) : null}
        </header>

        {blocksError ? (
          <p className="border-b border-border px-4 py-2 text-xs text-danger sm:px-5">
            {blocksError}
          </p>
        ) : null}

        {tableRows.length === 0 ? (
          <div className="chain-hub-blocks-empty mx-3 my-6 rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <Blocks className="mx-auto h-8 w-8 text-fg-subtle/50" aria-hidden />
            <p className="mt-3 text-sm font-medium text-fg-muted">
              No blocks indexed yet
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              Blocks will appear here as the chain syncs.
            </p>
          </div>
        ) : (
          <>
            {stripBlocks.length > 0 ? (
              <div className="block-chain-strip-panel mx-3 mb-3 mt-3">
                <div className="block-chain-strip-panel__meta">
                  <span>Older</span>
                  <span className="block-chain-strip-panel__meta-divider" />
                  <span>Newest</span>
                </div>
                <div
                  className="block-chain-strip"
                  aria-label={`Latest ${stripBlocks.length} ${config.ticker} blocks, oldest to newest`}
                >
                  <div className="block-chain-strip__track" aria-hidden>
                    <span className="block-chain-strip__track-base" />
                    <span className="block-chain-strip__track-flow" />
                  </div>
                  <div className="block-chain-strip__nodes">
                    {stripBlocks.map((block, index) => (
                      <BlockChainStripCell
                        key={block.hash}
                        block={block}
                        chainLogo={config.logo}
                        blockHref={config.blockHref?.(block.height)}
                        isTip={index === stripBlocks.length - 1}
                        tipLive={atTip && index === stripBlocks.length - 1}
                        indexing={
                          index === stripBlocks.length - 1 &&
                          isOptimisticTipBlock(block, chainId)
                        }
                        ageIndex={index}
                        totalCount={stripBlocks.length}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="block-chain-table-wrap overflow-x-auto border-t border-border">
              <table className="bc-table block-chain-table data-table data-table--stack">
                <thead>
                  <tr>
                    <th>Height</th>
                    <th>Hash</th>
                    <th>{producerColumnLabel}</th>
                    <th className="bc-col-age">Mined</th>
                    <th className="text-right">Txs</th>
                    <th className="text-right">Size</th>
                    <th className="text-right">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((block) => (
                    <BlockChainTableRow
                      key={block.hash}
                      block={block}
                      chainId={chainId}
                      blockHref={config.blockHref?.(block.height)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ChainHubStatRow
        cols={3}
        className="chain-hub-quick-stats shrink-0 border-y border-border"
      >
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
              <LiveRelativeTime
                time={tipBlock.time}
                interval="second"
                className="truncate"
              />
            ) : (
              "—"
            )
          }
        />
      </ChainHubStatRow>

      <div className="chain-hub-section__metrics shrink-0">
        <ChainMarketCard
          chainId={chainId}
          market={market}
          embedded
          animated
          hubLayout
        />
        <ChainNetworkCard
          chainId={chainId}
          network={network}
          embedded
          animated
          hubLayout
        />
      </div>
    </section>
  );
}

function BlockChainStripCell({
  block,
  chainLogo,
  blockHref,
  isTip,
  tipLive = false,
  indexing = false,
  ageIndex,
  totalCount,
}: {
  block: IndexedBlock;
  chainLogo: string;
  blockHref?: string;
  isTip: boolean;
  tipLive?: boolean;
  indexing?: boolean;
  ageIndex: number;
  totalCount: number;
}) {
  const recency = totalCount > 1 ? ageIndex / (totalCount - 1) : 1;
  const tooltip = indexing
    ? `Block #${formatHeight(block.height)} · indexing…`
    : `Block #${formatHeight(block.height)} · ${block.txCount} transaction${
        block.txCount === 1 ? "" : "s"
      }`;

  const nodeSlot = (
    <span
      className="block-chain-strip__node-slot"
      style={
        {
          "--block-recency": recency,
          "--block-stagger": `${ageIndex * 45}ms`,
        } as React.CSSProperties
      }
    >
      <span
        className={cn(
          "block-chain-strip__node",
          isTip && "block-chain-strip__node--tip",
          tipLive && "block-chain-strip__node--live",
          indexing && "block-chain-strip__node--indexing",
        )}
        title={tooltip}
      >
        <span className="block-chain-strip__logo-badge" aria-hidden>
          <Image
            src={chainLogo}
            alt=""
            width={20}
            height={20}
            className="block-chain-strip__logo"
          />
        </span>
      </span>
    </span>
  );

  return (
    <div
      className="block-chain-strip__cell"
      style={{ "--block-stagger": `${ageIndex * 45}ms` } as React.CSSProperties}
    >
      {blockHref ? (
        <Link
          href={blockHref}
          className="block-chain-strip__link"
          prefetch
          title={tooltip}
          aria-label={tooltip}
        >
          {nodeSlot}
        </Link>
      ) : (
        nodeSlot
      )}
      <span
        className={cn(
          "block-chain-strip__label tabular-nums",
          isTip && "block-chain-strip__label--tip",
        )}
      >
        {isTip && tipLive ? (
          <span className="block-chain-strip__label-dot" aria-hidden />
        ) : null}
        <span className="block-chain-strip__label-height">
          #{formatHeight(block.height)}
        </span>
      </span>
      <span className="block-chain-strip__txs tabular-nums" aria-hidden>
        {`${block.txCount} tx`}
      </span>
    </div>
  );
}

function BlockChainTableRow({
  block,
  chainId,
  blockHref,
}: {
  block: IndexedBlock;
  chainId: ChainId;
  blockHref?: string;
}) {
  const hashShort = formatBlockHashShort(block.hash);
  const indexing = isOptimisticTipBlock(block, chainId);
  const sizePending = indexing && block.size == null;
  const difficultyPending = indexing && !block.difficulty;

  return (
    <tr
      className={cn(
        "block-chain-table-row transition-colors hover:bg-bg-subtle/80",
        indexing && "block-chain-table-row--indexing",
      )}
      aria-busy={indexing}
    >
      <td data-label="Height">
        {blockHref ? (
          <BcTableLink href={blockHref} className="tabular-nums" prefetch>
            {formatHeight(block.height)}
          </BcTableLink>
        ) : (
          <span className="tabular-nums text-fg">
            {formatHeight(block.height)}
          </span>
        )}
      </td>
      <td data-label="Hash">
        {blockHref ? (
          <BcTableLink
            href={blockHref}
            className="text-sm tabular-nums"
            prefetch
          >
            {hashShort}
          </BcTableLink>
        ) : (
          <span className="text-sm text-fg-muted">{hashShort}</span>
        )}
      </td>
      <td
        data-label={chainId === "vrm" ? "Extracted by" : "Interest"}
        className="min-w-24 max-w-48 truncate"
      >
        {chainId === "vrm" ? (
          indexing ? (
            <BlockFieldLoading label="Extracted by" />
          ) : (
            <ExtractedByCell
              block={block}
              chainId={chainId}
              className={cn(
                "text-sm font-medium hover:underline",
                "text-[var(--chain-vrm)]",
              )}
            />
          )
        ) : indexing ? (
          <BlockFieldLoading label="Interest" />
        ) : (
          <span className="text-sm tabular-nums text-fg-muted">
            {formatPercent(block.interestRatePercent)}
          </span>
        )}
      </td>
      <td data-label="Mined" className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td data-label="Txs" className="text-right tabular-nums text-fg-muted">
        {formatHeight(block.txCount)}
      </td>
      <td data-label="Size" className="text-right tabular-nums text-fg-muted">
        {block.size != null ? (
          `${formatHeight(block.size)} B`
        ) : sizePending ? (
          <BlockFieldLoading align="right" />
        ) : (
          "—"
        )}
      </td>
      <td
        data-label="Difficulty"
        className="text-right tabular-nums text-fg-muted"
      >
        {block.difficulty ? (
          formatDifficulty(block.difficulty)
        ) : difficultyPending ? (
          <BlockFieldLoading align="right" />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function BlockFieldLoading({
  label,
  align = "left",
}: {
  label?: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        align === "right" && "ml-auto",
      )}
      role="status"
      aria-label={label ? `${label} loading` : "Loading"}
    >
      <span className="block-field-loading" />
    </span>
  );
}

function formatBlockHashShort(hash: string): string {
  const h = hash.replace(/^0x/i, "");
  if (h.length <= 8) return h;
  return `${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
