"use client";

import Image from "next/image";
import Link from "next/link";
import { Blocks, ChevronRight, ExternalLink } from "lucide-react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcTableLink } from "@/components/explorer/BlockchairUi";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import { StatusDot, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import {
  ChainHubStatCell,
  ChainHubStatRow,
} from "@/components/explorer/home/ChainHubStats";
import type {
  ChainMarket,
  ChainSummary,
  IndexedBlock,
  VrcNetworkStats,
  VrmNetworkStats,
} from "@/lib/api/types";
import {
  CHAIN_EXPLORERS,
  CHAIN_THEME,
  getChainStatusTone,
  getChainSyncLabel,
  getChainTipHeight,
  isChainAtTip,
  type ChainId,
} from "@/lib/chainDisplay";
import { formatPercent } from "@/lib/formatMarket";
import { cn, formatDifficulty } from "@/lib/utils";

const STRIP_BLOCK_COUNT = 5;
const HUB_TABLE_ROW_COUNT = 5;

export interface ChainHubSectionProps {
  chainId: ChainId;
  summary: ChainSummary;
  chainHeight: number | null;
  heightPulse: boolean;
  market: ChainMarket;
  network: VrmNetworkStats | VrcNetworkStats;
  blocks: IndexedBlock[];
}

/** Chain overview, market, network, live block strip, and recent blocks table. */
export function ChainHubSection({
  chainId,
  summary,
  chainHeight,
  heightPulse,
  market,
  network,
  blocks,
}: ChainHubSectionProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const health = summary.health;
  const tipBlock = blocks[0] ?? summary.latestBlocks[0];
  const atTip = isChainAtTip(health, tipBlock?.height, chainHeight);
  const statusTone = getChainStatusTone(health, tipBlock?.height, chainHeight);
  const displayHeight = chainHeight ?? getChainTipHeight(health);
  const stripBlocks = [...blocks.slice(0, STRIP_BLOCK_COUNT)].reverse();
  const tableRows = Array.from({ length: HUB_TABLE_ROW_COUNT }, (_, index) =>
    blocks[index] ?? null,
  );
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
        } as React.CSSProperties
      }
    >
      <div className="chain-hub-section__identity flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="chain-hub-section__logo-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-bg-subtle/60">
            <Image
              src={config.logo}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
                {config.name}
              </h2>
              <span className="chain-hub-section__ticker rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                {config.ticker}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-sm text-fg-muted">
              {/* <span
                className={cn(
                  "chain-hub-section__status inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
                  atTip
                    ? "chain-hub-section__status--live"
                    : "border-border text-fg-muted",
                )}
              >
                <StatusDot tone={statusTone} pulse={atTip} />
                {getChainSyncLabel(health, tipBlock?.height, chainHeight)}
              </span> */}
              <span className="text-fg-subtle">{config.consensus}</span>
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

      <ChainHubStatRow
        cols={3}
        className="chain-hub-quick-stats border-b border-border"
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

      <div className="chain-hub-section__blocks min-h-0 flex-1">
        <header className="chain-hub-blocks-head flex flex-wrap items-center justify-between gap-2 border-b border-t border-border px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="chain-hub-blocks-head__icon flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-bg-subtle/50">
              <Blocks className="h-4 w-4 text-fg-muted" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-fg">Latest blocks</h3>
              <p className="text-xs text-fg-subtle">
                {stripBlocks.length > 0
                  ? `${stripBlocks.length} most recent · click to open`
                  : "Waiting for indexed blocks"}
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

        {stripBlocks.length === 0 ? (
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
            <div className="block-chain-strip-panel mx-3 mb-2.5 mt-2.5">
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
                      ageIndex={index}
                      totalCount={stripBlocks.length}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="block-chain-table-wrap overflow-x-auto border-t border-border">
              <table className="bc-table block-chain-table">
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
                  {tableRows.map((block, index) =>
                    block ? (
                      <BlockChainTableRow
                        key={block.hash}
                        block={block}
                        chainId={chainId}
                        blockHref={config.blockHref?.(block.height)}
                      />
                    ) : (
                      <BlockChainTablePlaceholderRow key={`placeholder-${index}`} />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
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
  ageIndex,
  totalCount,
}: {
  block: IndexedBlock;
  chainLogo: string;
  blockHref?: string;
  isTip: boolean;
  tipLive?: boolean;
  ageIndex: number;
  totalCount: number;
}) {
  const recency = totalCount > 1 ? ageIndex / (totalCount - 1) : 1;
  const tooltip = `Block #${formatHeight(block.height)} · ${block.txCount} transaction${
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
        {block.txCount} tx
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

  return (
    <tr className="block-chain-table-row transition-colors hover:bg-bg-subtle/80">
      <td>
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
      <td>
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
      <td className="min-w-24 max-w-48 truncate">
        {chainId === "vrm" ? (
          <ExtractedByCell
            block={block}
            chainId={chainId}
            className={cn(
              "text-sm font-medium hover:underline",
              "text-[var(--chain-vrm)]",
            )}
          />
        ) : (
          <span className="text-sm tabular-nums text-fg-muted">
            {formatPercent(block.interestRatePercent)}
          </span>
        )}
      </td>
      <td className="bc-col-age text-fg-muted">
        <LiveRelativeTime time={block.time} interval="second" fixedWidth />
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {formatHeight(block.txCount)}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.size != null ? `${formatHeight(block.size)} B` : "—"}
      </td>
      <td className="text-right tabular-nums text-fg-muted">
        {block.difficulty ? formatDifficulty(block.difficulty) : "—"}
      </td>
    </tr>
  );
}

function BlockChainTablePlaceholderRow() {
  return (
    <tr className="block-chain-table-row block-chain-table-row--placeholder" aria-hidden>
      {Array.from({ length: 7 }, (_, index) => (
        <td key={index}>&nbsp;</td>
      ))}
    </tr>
  );
}

function formatBlockHashShort(hash: string): string {
  const h = hash.replace(/^0x/i, "");
  if (h.length <= 8) return h;
  return `${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
