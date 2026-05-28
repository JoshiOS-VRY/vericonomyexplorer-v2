import Link from "next/link";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import {
  FeatureTile,
  RankList,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import type { LeaderboardResult, RichlistResult } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { cn, ellipsizeMiddle } from "@/lib/utils";

export function VericonomyHomeStatic({
  vrmRichlist,
  vrcRichlist,
  vrmLeaderboard,
}: {
  vrmRichlist: RichlistResult;
  vrcRichlist: RichlistResult;
  vrmLeaderboard: LeaderboardResult;
}) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChainRichlistPanel richlist={vrmRichlist} />
        <ChainRichlistPanel richlist={vrcRichlist} />
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
    </>
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
        prefetch
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
            href: `/${richlist.chainId}/address/${item.address}`,
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
