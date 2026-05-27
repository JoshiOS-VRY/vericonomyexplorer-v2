"use client";

import Link from "next/link";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { FeatureTile } from "@/components/explorer/ExplorerUi";
import { LiveBlocksFeed, NewBlockToast } from "@/components/explorer/home/LiveBlocksFeed";
import { ChainExplorerHero } from "@/components/explorer/vrm/VrmChainHero";
import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { ChainSummary, RichlistResult } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { ellipsizeMiddle } from "@/lib/utils";

export function VrcChainDashboard({
  summary: initialSummary,
  richlist: initialRichlist,
}: {
  summary: ChainSummary;
  richlist: RichlistResult;
}) {
  const live = useLiveChainSummary("vrc", initialSummary);
  const {
    summary,
    chainHeight,
    latestBlocks,
    newBlockHashes,
    toastBlock,
    heightPulse,
  } = live;

  const tipBlock = latestBlocks[0];

  return (
    <div className="space-y-6">
      {toastBlock ? <NewBlockToast block={toastBlock} chainId="vrc" /> : null}

      <ChainExplorerHero
        chainId="vrc"
        health={summary.health}
        chainHeight={chainHeight}
        heightPulse={heightPulse}
        tipBlock={tipBlock}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <LiveBlocksFeed chainId="vrc" blocks={latestBlocks} newBlockHashes={newBlockHashes} />
        <VrcRichlistPreview richlist={initialRichlist} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureTile
          title="VeriCoin rich list"
          description="Positive-balance VRC addresses ranked by balance."
          href="/vrc/richlist"
          hrefLabel="View rich list"
        />
        <FeatureTile
          title="Verium explorer"
          description="Blocks, transactions, and addresses on the Verium chain."
          href="/vrm"
          hrefLabel="Open Verium"
        />
        <FeatureTile
          title="API reference"
          description="REST endpoints for integrations and automation."
          href="/api/docs"
          hrefLabel="Read API docs"
        />
      </div>
    </div>
  );
}

function VrcRichlistPreview({ richlist }: { richlist: RichlistResult }) {
  const config = CHAIN_EXPLORERS.vrc;

  return (
    <BcPanel
      title="Rich list"
      action={
        config.richlistHref ? (
          <Link href={config.richlistHref} className="text-xs font-semibold text-accent hover:underline">
            View all
          </Link>
        ) : null
      }
    >
      {!richlist.enabled && richlist.message ? (
        <p className="text-sm text-fg-muted">{richlist.message}</p>
      ) : richlist.items.length === 0 ? (
        <p className="text-sm text-fg-muted">No ranked balances yet.</p>
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
