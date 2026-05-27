"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcStat, BcStatGrid } from "@/components/explorer/BlockchairUi";
import { StatusDot, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import type {
  ChainMarket,
  ChainSummary,
  VrcNetworkStats,
  VrmNetworkStats,
} from "@/lib/api/types";
import {
  CHAIN_EXPLORERS,
  getChainStatusTone,
  getChainSyncLabel,
  getChainTipHeight,
  isChainAtTip,
} from "@/lib/chainDisplay";
import { cn } from "@/lib/utils";

export function ChainSummaryCard({
  chainId,
  summary,
  chainHeight,
  heightPulse,
  market,
  network,
}: {
  chainId: "vrm" | "vrc";
  summary: ChainSummary;
  chainHeight: number | null;
  heightPulse: boolean;
  market: ChainMarket;
  network: VrmNetworkStats | VrcNetworkStats;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const health = summary.health;
  const tipBlock = summary.latestBlocks[0];
  const atTip = isChainAtTip(health, tipBlock?.height);
  const statusTone = getChainStatusTone(health, tipBlock?.height);
  const exploreReady = config.exploreHref != null;
  const displayHeight = chainHeight ?? getChainTipHeight(health);

  const content = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Image
            src={config.logo}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-fg">{config.name}</h2>
              <span className="rounded bg-bg-subtle px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted">
                {config.ticker}
              </span>
              <span className="text-xs text-fg-subtle">{config.consensus}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-fg-muted">
              <StatusDot tone={statusTone} pulse={atTip} />
              <span>{getChainSyncLabel(health, tipBlock?.height)}</span>
            </div>
          </div>
        </div>
        {exploreReady ? (
          <span
            className={cn(
              "chain-explore-btn pointer-events-none shrink-0 rounded-lg px-3 py-1.5 text-xs",
              chainId === "vrm" ? "chain-explore-btn-vrm" : "chain-explore-btn-vrc",
            )}
            aria-hidden
          >
            <span className="inline-flex items-center gap-1">
              Explore
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </span>
        ) : (
          <span className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-subtle">
            Stats live
          </span>
        )}
      </div>

      <BcStatGrid className="chain-summary-stat-grid">
        <BcStat
          label="Block height"
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
          label="Latest block"
          value={
            tipBlock ? (
              <LiveRelativeTime
                time={tipBlock.time}
                interval="second"
                className="truncate text-lg font-bold sm:text-xl"
              />
            ) : (
              "—"
            )
          }
        />
        <BcStat
          label="Indexed blocks"
          value={formatHeight(health.counts.indexedBlockCount)}
          numericValue={health.counts.indexedBlockCount}
          animated
        />
      </BcStatGrid>

      <div className="border-t border-border">
        <ChainMarketCard chainId={chainId} market={market} embedded animated />
      </div>

      <div className="border-t border-border">
        <ChainNetworkCard chainId={chainId} network={network} embedded animated />
      </div>
    </>
  );

  if (exploreReady && config.exploreHref) {
    return (
      <Link
        href={config.exploreHref}
        prefetch
        className={cn(
          "chain-summary-card block overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm outline-none",
          chainId === "vrm" ? "chain-summary-card-vrm" : "chain-summary-card-vrc",
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      {content}
    </section>
  );
}

export function ChainSummaryCardSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="h-10 w-48 animate-pulse rounded-md bg-bg-subtle" />
      </div>
      <div className="m-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg border border-border bg-bg-subtle" />
        ))}
      </div>
      <div className="h-28 animate-pulse border-t border-border bg-bg-subtle" />
      <div className="h-28 animate-pulse border-t border-border bg-bg-subtle" />
    </section>
  );
}
