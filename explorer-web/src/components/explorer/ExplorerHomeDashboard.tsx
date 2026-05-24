import Image from "next/image";
import Link from "next/link";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import {
  BcPanel,
  BcStat,
  BcStatGrid,
  BcTableLink,
} from "@/components/explorer/BlockchairUi";
import {
  FeatureTile,
  PageHero,
  RankList,
  StatusDot,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import type {
  ChainSummary,
  LeaderboardResult,
  RichlistResult,
} from "@/lib/api/types";
import {
  CHAIN_EXPLORERS,
  formatBlocksBehind,
  getChainStatusLabel,
  getChainStatusTone,
  getChainTipHeight,
} from "@/lib/chainDisplay";
import { cn, ellipsizeMiddle } from "@/lib/utils";

interface ExplorerHomeDashboardProps {
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  vrmRichlist: RichlistResult;
  vrcRichlist: RichlistResult;
  vrmLeaderboard: LeaderboardResult;
}

export function ExplorerHomeDashboard({
  vrmSummary,
  vrcSummary,
  vrmRichlist,
  vrcRichlist,
  vrmLeaderboard,
}: ExplorerHomeDashboardProps) {
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="VeriConomy Explorer"
        title="Dual-chain block explorer"
        subtitle="Live chain stats, recent blocks, and indexed balances for Verium (VRM) and VeriCoin (VRC). Search and deep explorer tools are available for Verium today; VeriCoin index data is shown here as it becomes available."
        actions={
          <>
            <Link
              href="/vrm"
              className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent/90"
            >
              Open Verium explorer
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center rounded-lg border border-border bg-bg-panel px-4 py-2 text-sm font-semibold text-fg transition hover:bg-bg-subtle"
            >
              Node tools
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChainOverviewPanel summary={vrmSummary} />
        <ChainOverviewPanel summary={vrcSummary} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChainBlocksPanel summary={vrmSummary} />
        <ChainBlocksPanel summary={vrcSummary} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChainRichlistPanel richlist={vrmRichlist} />
        <ChainRichlistPanel richlist={vrcRichlist} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureTile
          title="Verium rich list"
          description="Positive-balance VRM addresses ranked from the indexed balance table."
          href="/vrm/richlist"
          hrefLabel="View rich list"
        />
        <FeatureTile
          title="Verium activity"
          description="Monthly transfer activity leaderboard derived from indexed address deltas."
          href="/vrm/leaderboard?period=month&sort=activity"
          hrefLabel="View leaderboard"
        />
        <FeatureTile
          title="API reference"
          description="Indexer and node proxy endpoints for integrations and automation."
          href="/api/docs"
          hrefLabel="Read API docs"
        />
      </div>

      {vrmLeaderboard.enabled !== false && vrmLeaderboard.items.length > 0 ? (
        <BcPanel
          title="Verium monthly activity"
          action={
            <Link href="/vrm/leaderboard?period=month&sort=activity" className="text-xs font-semibold text-accent hover:underline">
              Full leaderboard
            </Link>
          }
        >
          <RankList
            items={vrmLeaderboard.items.map((item) => ({
              href: `/vrm/address/${item.address}`,
              rank: item.rank,
              label: ellipsizeMiddle(item.address, 18),
              value: `${formatHeight(item.txCount)} tx`,
            }))}
          />
        </BcPanel>
      ) : null}
    </div>
  );
}

function ChainOverviewPanel({ summary }: { summary: ChainSummary }) {
  const config = CHAIN_EXPLORERS[summary.chainId as "vrm" | "vrc"];
  if (!config) return null;

  const health = summary.health;
  const tipHeight = getChainTipHeight(health);
  const tipBlock = summary.latestBlocks[0];
  const tone = getChainStatusTone(health);
  const exploreReady = config.exploreHref != null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Image src={config.logo} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-fg">{config.name}</h2>
              <span className="rounded bg-bg-subtle px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted">
                {config.ticker}
              </span>
              <span className="text-xs text-fg-subtle">{config.consensus}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-fg-muted">
              <StatusDot tone={tone} pulse={health.explorerStatus?.syncing} />
              <span>{getChainStatusLabel(health)}</span>
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
            Index preview
          </span>
        )}
      </div>

      <BcStatGrid>
        <BcStat label="Block height" value={formatHeight(tipHeight)} />
        <BcStat label="Indexed addresses" value={formatHeight(health.counts.addressCount)} />
        <BcStat
          label="Latest block"
          value={
            tipBlock ? (
              <LiveRelativeTime time={tipBlock.time} interval="second" className="text-xl font-bold sm:text-2xl" />
            ) : (
              "—"
            )
          }
        />
        <BcStat label="Sync lag" value={formatBlocksBehind(health)} />
      </BcStatGrid>

      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
        <OverviewFact label="Indexed blocks" value={formatHeight(health.counts.indexedBlockCount)} />
        <OverviewFact label="Recent txs" value={formatHeight(summary.recentTransactions.length)} hint="In summary feed" />
        <OverviewFact
          label="Explorer"
          value={exploreReady ? "Available" : "Coming soon"}
          hint={exploreReady ? "Search, blocks, addresses" : "Home stats only for now"}
        />
      </div>
    </section>
  );
}

function OverviewFact({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-bg-panel px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-fg">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-fg-subtle">{hint}</div> : null}
    </div>
  );
}

function ChainBlocksPanel({ summary }: { summary: ChainSummary }) {
  const config = CHAIN_EXPLORERS[summary.chainId as "vrm" | "vrc"];
  if (!config) return null;

  const blocks = summary.latestBlocks.slice(0, 8);
  const action = config.exploreHref ? (
    <Link href={config.exploreHref} className="text-xs font-semibold text-accent hover:underline">
      View all
    </Link>
  ) : null;

  return (
    <BcPanel title={`Latest ${config.ticker} blocks`} flush action={action}>
      {blocks.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">No blocks indexed yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Height</th>
                <th className="bc-col-age">Time</th>
                <th className="text-right">Txs</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.hash}>
                  <td>
                    {config.blockHref ? (
                      <BcTableLink href={config.blockHref(block.height)} className="tabular-nums">
                        {formatHeight(block.height)}
                      </BcTableLink>
                    ) : (
                      <span className="tabular-nums text-fg">{formatHeight(block.height)}</span>
                    )}
                  </td>
                  <td className="bc-col-age text-fg-muted">
                    <LiveRelativeTime time={block.time} interval="second" fixedWidth />
                  </td>
                  <td className="text-right tabular-nums text-fg-muted">{formatHeight(block.txCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BcPanel>
  );
}

function ChainRichlistPanel({ richlist }: { richlist: RichlistResult }) {
  const config = CHAIN_EXPLORERS[richlist.chainId as "vrm" | "vrc"];
  if (!config) return null;

  const action =
    config.richlistHref && richlist.enabled !== false ? (
      <Link href={config.richlistHref} className="text-xs font-semibold text-accent hover:underline">
        View all
      </Link>
    ) : null;

  return (
    <BcPanel title={`Top ${config.ticker} balances`} action={action}>
      {!richlist.enabled && richlist.message ? (
        <p className={cn("text-sm text-fg-muted")}>{richlist.message}</p>
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
              <strong className="flex-1 truncate font-mono text-xs text-fg">
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
