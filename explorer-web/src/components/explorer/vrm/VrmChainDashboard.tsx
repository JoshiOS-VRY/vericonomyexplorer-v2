"use client";

import { useEffect, useState } from "react";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { ChainMarket, VrmDashboardPayload, VrmNetworkStats } from "@/lib/api/types";
import { fetchHomeMarket, fetchHomeNetwork } from "@/lib/api/client";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";
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
}: VrmDashboardPayload) {
  const [market, setMarket] = useState<ChainMarket>(emptyMarketPayload().vrm);
  const [network, setNetwork] = useState<VrmNetworkStats>(emptyNetworkPayload().vrm);
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [marketPayload, networkPayload] = await Promise.all([
          fetchHomeMarket(),
          fetchHomeNetwork(),
        ]);
        if (!cancelled) {
          setMarket(marketPayload.vrm);
          setNetwork(networkPayload.vrm);
        }
      } catch {
        /* keep empty defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
        tipBlock={tipBlock}
        heightPulse={heightPulse}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainMarketCard chainId="vrm" market={market} />
        <ChainNetworkCard chainId="vrm" network={network} />
      </div>

      <LazyVrmChainActivityChart />

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
