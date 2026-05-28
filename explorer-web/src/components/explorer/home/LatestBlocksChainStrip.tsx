"use client";

import { useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import {
  BcStat,
  BcStatGrid,
  BcTableLink,
} from "@/components/explorer/BlockchairUi";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import { StatusDot, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
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

const STRIP_BLOCK_COUNT = 10;
const HUB_TABLE_ROW_COUNT = 5;

export interface ChainHubSectionProps {
  chainId: ChainId;
  summary: ChainSummary;
  chainHeight: number | null;
  heightPulse: boolean;
  market: ChainMarket;
  network: VrmNetworkStats | VrcNetworkStats;
  blocks: IndexedBlock[];
  newBlockHashes: Set<string>;
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
  newBlockHashes,
}: ChainHubSectionProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const health = summary.health;
  const tipBlock = summary.latestBlocks[0];
  const atTip = isChainAtTip(health, tipBlock?.height);
  const statusTone = getChainStatusTone(health, tipBlock?.height);
  const displayHeight = chainHeight ?? getChainTipHeight(health);
  const stripBlocks = [...blocks.slice(0, STRIP_BLOCK_COUNT)].reverse();
  const tableRows = blocks.slice(0, HUB_TABLE_ROW_COUNT);
  const reducedMotion = useReducedMotion();
  const producerColumnLabel = chainId === "vrm" ? "Extracted by" : "Interest";

  return (
    <section
      className={cn(
        "chain-hub-section block-chain-section flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm",
      )}
      data-chain={chainId}
      style={
        {
          "--block-chain-accent": theme.accent,
          "--block-chain-accent-soft": theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <div className="chain-hub-section__identity flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src={config.logo}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-bold text-fg">{config.name}</h2>
              <span className="rounded bg-bg-subtle px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-fg-muted">
                {config.ticker}
              </span>
              <span className="text-[10px] text-fg-subtle">
                {config.consensus}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
              <StatusDot tone={statusTone} pulse={atTip} />
              <span>{getChainSyncLabel(health, tipBlock?.height)}</span>
            </div>
          </div>
        </div>
        {config.exploreHref ? (
          <Link
            href={config.exploreHref}
            prefetch
            className={cn(
              "chain-explore-btn shrink-0 rounded-md px-2.5 py-1 text-[11px]",
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

      <BcStatGrid className="chain-hub-quick-stats chain-summary-stat-grid border-b border-border">
        <BcStat
          label="Height"
          value={formatHeight(displayHeight)}
          numericValue={displayHeight ?? undefined}
          animated
          pulse={heightPulse}
        />
        <BcStat
          label="Addresses"
          value={formatHeight(health.counts.addressCount)}
          numericValue={health.counts.addressCount}
          animated
        />
        <BcStat
          label="Latest"
          value={
            tipBlock ? (
              <LiveRelativeTime
                time={tipBlock.time}
                interval="second"
                className="truncate text-xs font-semibold"
              />
            ) : (
              "—"
            )
          }
        />
      </BcStatGrid>

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

      <div className="chain-hub-section__blocks shrink-0">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-t border-border px-3 py-1.5 sm:px-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
            Latest {config.ticker} blocks
          </h3>
          {config.exploreHref ? (
            <Link
              href={config.exploreHref}
              className={cn(
                "text-xs font-semibold hover:underline",
                chainId === "vrm"
                  ? "text-[var(--chain-vrm)]"
                  : "text-[var(--chain-vrc)]",
              )}
            >
              View all
            </Link>
          ) : null}
        </header>

        {stripBlocks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-fg-muted">No blocks yet.</p>
        ) : (
          <>
            <div className="block-chain-strip m-2">
              <div
                className="block-chain-strip__track animate-pulse rounded-xl shadow"
                aria-hidden
              />
              <div className="block-chain-strip__nodes">
                {stripBlocks.map((block, index) => (
                  <BlockChainStripCell
                    key={block.hash}
                    block={block}
                    chainLogo={config.logo}
                    blockHref={config.blockHref?.(block.height)}
                    isTip={index === stripBlocks.length - 1}
                    isNew={newBlockHashes.has(block.hash) && !reducedMotion}
                  />
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border-t border-border px-2">
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
                  {tableRows.map((block) => (
                    <BlockChainTableRow
                      key={block.hash}
                      block={block}
                      chainId={chainId}
                      blockHref={config.blockHref?.(block.height)}
                      isNew={newBlockHashes.has(block.hash) && !reducedMotion}
                    />
                  ))}
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
  isNew,
}: {
  block: IndexedBlock;
  chainLogo: string;
  blockHref?: string;
  isTip: boolean;
  isNew: boolean;
}) {
  const nodeSlot = (
    <span className="block-chain-strip__node-slot">
      <span
        className={cn(
          "block-chain-strip__node",
          isTip && "block-chain-strip__node--tip",
          isNew && "block-chain-strip__node--arrived",
        )}
        title={`Block #${formatHeight(block.height)}`}
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
    <div className="block-chain-strip__cell">
      {blockHref ? (
        <Link href={blockHref} className="block-chain-strip__link" prefetch>
          {nodeSlot}
        </Link>
      ) : (
        nodeSlot
      )}
      <span className="block-chain-strip__label tabular-nums">
        #{formatHeight(block.height)}
      </span>
    </div>
  );
}

function BlockChainTableRow({
  block,
  chainId,
  blockHref,
  isNew,
}: {
  block: IndexedBlock;
  chainId: ChainId;
  blockHref?: string;
  isNew: boolean;
}) {
  const hashShort = formatBlockHashShort(block.hash);

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-bg-subtle/80",
        isNew && "block-chain-table-row--new",
      )}
    >
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
          <BcTableLink href={blockHref} className="text-xs" prefetch>
            {hashShort}
          </BcTableLink>
        ) : (
          <span className="text-xs text-fg-muted">{hashShort}</span>
        )}
      </td>
      <td className="min-w-24 max-w-48 truncate">
        {chainId === "vrm" ? (
          <ExtractedByCell
            block={block}
            chainId={chainId}
            className={cn(
              "text-xs font-medium hover:underline",
              "text-[var(--chain-vrm)]",
            )}
          />
        ) : (
          <span className="text-xs tabular-nums text-fg-muted">
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

function formatBlockHashShort(hash: string): string {
  const h = hash.replace(/^0x/i, "");
  if (h.length <= 8) return h;
  return `${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
