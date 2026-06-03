"use client";

import Image from "next/image";
import Link from "next/link";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import {
  BcPanel,
  BcStat,
  BcStatGrid,
} from "@/components/explorer/BlockchairUi";
import {
  FeatureTile,
  RankList,
  StatusDot,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { BinaryChainActivity } from "@/components/explorer/home/BinaryChainActivity";
import { BinaryChainHero } from "@/components/explorer/home/BinaryChainHero";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import { LiveBlocksFeed } from "@/components/explorer/home/LiveBlocksFeed";
import { useDualChainLive } from "@/hooks/useDualChainLive";
import { useHomeMarket } from "@/hooks/useHomeMarket";
import type { HomePayload, RichlistResult } from "@/lib/api/types";
import {
  CHAIN_EXPLORERS,
  getChainTipHeight,
  isChainLive,
} from "@/lib/chainDisplay";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { cn, ellipsizeMiddle } from "@/lib/utils";

interface VericonomyHomeDashboardProps {
  initialHome: HomePayload;
}

export function VericonomyHomeDashboard({
  initialHome,
}: VericonomyHomeDashboardProps) {
  const live = useDualChainLive(
    initialHome.vrm.summary,
    initialHome.vrc.summary,
  );
  const market = useHomeMarket({
    vrm: initialHome.vrm.market,
    vrc: initialHome.vrc.market,
    fetchedAt: initialHome.fetchedAt,
  });

  const vrmLive = isChainLive(
    live.vrm.summary.health,
    live.vrm.summary.latestBlocks[0]?.height,
    live.vrm.chainHeight,
  );
  const vrcLive = isChainLive(
    live.vrc.summary.health,
    live.vrc.summary.latestBlocks[0]?.height,
    live.vrc.chainHeight,
  );

  return (
    <div className="space-y-8">
      <BinaryChainHero vrmLive={vrmLive} vrcLive={vrcLive} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainOverviewPanel
          chainId="vrm"
          summary={live.vrm.summary}
          heightPulse={live.vrm.heightPulse}
          chainHeight={live.vrm.chainHeight}
        />
        <ChainOverviewPanel
          chainId="vrc"
          summary={live.vrc.summary}
          heightPulse={live.vrc.heightPulse}
          chainHeight={live.vrc.chainHeight}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainMarketCard chainId="vrm" market={market.vrmMarket} />
        <ChainMarketCard chainId="vrc" market={market.vrcMarket} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainNetworkCard chainId="vrm" network={initialHome.vrm.network} />
        <ChainNetworkCard chainId="vrc" network={initialHome.vrc.network} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LiveBlocksFeed
          chainId="vrm"
          seedBlocks={live.vrm.latestBlocks}
        />
        <LiveBlocksFeed
          chainId="vrc"
          seedBlocks={live.vrc.latestBlocks}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureTile
          title="Verium rich list"
          description="Positive-balance VRM addresses ranked by balance."
          href="/vrm/richlist"
          hrefLabel="View rich list"
        />
        <FeatureTile
          title="Verium activity"
          description="Monthly transfer activity leaderboard by address."
          href="/vrm/leaderboard?period=month&sort=activity"
          hrefLabel="View leaderboard"
        />
        <FeatureTile
          title="API reference"
          description="API and node proxy endpoints for integrations and automation."
          href="/api/docs"
          hrefLabel="Read API docs"
        />
      </div>
    </div>
  );
}

function ChainOverviewPanel({
  chainId,
  summary,
  chainHeight,
  heightPulse,
}: {
  chainId: "vrm" | "vrc";
  summary: HomePayload["vrm"]["summary"];
  chainHeight: number | null;
  heightPulse: boolean;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const health = summary.health;
  const tipBlock = summary.latestBlocks[0];
  const live = isChainLive(health, tipBlock?.height, chainHeight);
  const exploreReady = config.exploreHref != null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
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
              <StatusDot tone={live ? "success" : "warning"} pulse={live} />
              <span>{live ? "Live" : "Offline"}</span>
            </div>
          </div>
        </div>
        {exploreReady ? (
          <Link
            href={config.exploreHref!}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent/90"
          >
            Explore
          </Link>
        ) : (
          <span className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-subtle">
            Stats live
          </span>
        )}
      </div>

      <BcStatGrid>
        <BcStat
          label="Block height"
          value={formatHeight(chainHeight ?? getChainTipHeight(health))}
          pulse={heightPulse}
        />
        <BcStat
          label="Addresses"
          value={formatHeight(health.counts.addressCount)}
        />
        <BcStat
          label="Latest block"
          value={
            tipBlock ? (
              <LiveRelativeTime
                time={tipBlock.time}
                interval="second"
                className="text-lg font-bold sm:text-xl truncate"
              />
            ) : (
              "—"
            )
          }
        />
      </BcStatGrid>
    </section>
  );
}

function ChainRichlistPanel({ richlist }: { richlist: RichlistResult }) {
  const config = CHAIN_EXPLORERS[richlist.chainId as "vrm" | "vrc"];
  if (!config) return null;

  const action =
    config.richlistHref && richlist.enabled !== false ? (
      <Link
        href={config.richlistHref}
        className="text-xs font-semibold text-accent hover:underline"
      >
        View all
      </Link>
    ) : null;

  return (
    <BcPanel title={`Top ${config.ticker} balances`} action={action}>
      {!richlist.enabled && richlist.message ? (
        <p className={cn("text-sm text-fg-muted")}>
          {formatExplorerUserMessage(richlist.message)}
        </p>
      ) : richlist.items.length === 0 ? (
        <p className="text-sm text-fg-muted">No ranked balances yet.</p>
      ) : config.exploreHref ? (
        <RankList
          items={richlist.items.map((item) => ({
            href: `/vrm/address/${item.address}`,
            rank: item.rank,
            label: ellipsizeMiddle(item.address, 18),
            value: `${item.balance.amount} ${item.balance.ticker}`,
          }))}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {richlist.items.map((item) => (
            <div
              key={item.address}
              className="flex items-center gap-3 border-t border-border px-4 py-2.5 first:border-t-0"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-fg-subtle">
                {item.rank}
              </span>
              <strong className="flex-1 truncate text-xs text-fg">
                {ellipsizeMiddle(item.address, 18)}
              </strong>
              <em className="text-sm not-italic tabular-nums text-fg-muted">
                {item.balance.amount} {item.balance.ticker}
              </em>
            </div>
          ))}
        </div>
      )}
    </BcPanel>
  );
}
