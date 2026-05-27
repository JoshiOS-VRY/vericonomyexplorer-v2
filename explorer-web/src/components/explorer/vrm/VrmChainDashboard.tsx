"use client";

import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { VrmDashboardPayload } from "@/lib/api/types";
import { VrmBlocksPanel } from "@/components/explorer/vrm/VrmBlocksPanel";
import { LazyVrmChainActivityChart } from "@/components/explorer/vrm/LazyVrmChainActivityChart";
import { VrmChainHero } from "@/components/explorer/vrm/VrmChainHero";
import { VrmLeaderboardPreview } from "@/components/explorer/vrm/VrmLeaderboardPreview";
import { VrmMetricStrip } from "@/components/explorer/vrm/VrmMetricStrip";
import { VrmNewBlockToast } from "@/components/explorer/vrm/VrmNewBlockToast";
import { VrmQuickNav } from "@/components/explorer/vrm/VrmQuickNav";
import { VrmRichlistPreview } from "@/components/explorer/vrm/VrmRichlistPreview";
import { VrmTransactionsPanel } from "@/components/explorer/vrm/VrmTransactionsPanel";

export function VrmChainDashboard({
  summary: initialSummary,
  richlist: initialRichlist,
  leaderboard: initialLeaderboard,
  network: initialNetwork,
  market: initialMarket,
  activityHistory: initialActivityHistory,
}: VrmDashboardPayload) {
  const live = useLiveChainSummary("vrm", initialSummary);
  const {
    summary,
    chainHeight,
    addressCount,
    latestBlocks,
    newBlockHashes,
    toastBlock,
    heightPulse,
  } = live;

  const tipBlock = latestBlocks[0];
  const tipBlockHref = tipBlock ? `/vrm/block/${tipBlock.height}` : null;

  return (
    <div className="space-y-6">
      {toastBlock ? <VrmNewBlockToast block={toastBlock} /> : null}

      <VrmChainHero
        health={summary.health}
        chainHeight={chainHeight}
        heightPulse={heightPulse}
        tipBlock={tipBlock}
      />

      <VrmMetricStrip
        chainHeight={chainHeight}
        addressCount={addressCount}
        health={summary.health}
        tipBlock={tipBlock}
        heightPulse={heightPulse}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainMarketCard chainId="vrm" market={initialMarket} />
        <ChainNetworkCard chainId="vrm" network={initialNetwork} />
      </div>

      <LazyVrmChainActivityChart initialHistory={initialActivityHistory} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <VrmBlocksPanel blocks={latestBlocks} newBlockHashes={newBlockHashes} />
        <div className="flex flex-col gap-6">
          <VrmRichlistPreview richlist={initialRichlist} />
          <VrmLeaderboardPreview leaderboard={initialLeaderboard} />
        </div>
      </div>

      <VrmTransactionsPanel transactions={summary.recentTransactions} />

      <VrmQuickNav tipBlockHref={tipBlockHref} />
    </div>
  );
}
