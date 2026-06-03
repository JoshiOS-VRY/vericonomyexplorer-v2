"use client";

import { useEffect, useState } from "react";
import { ChainMarketCard } from "@/components/explorer/home/ChainMarketCard";
import { ChainNetworkCard } from "@/components/explorer/home/ChainNetworkCard";
import { ChainBlocksPanel } from "@/components/explorer/chain/ChainBlocksPanel";
import { LazyChainActivityChart } from "@/components/explorer/chain/LazyChainActivityChart";
import { ChainMetricStrip } from "@/components/explorer/chain/ChainMetricStrip";
import { ChainQuickNav } from "@/components/explorer/chain/ChainQuickNav";
import { ChainRichlistPreview } from "@/components/explorer/chain/ChainRichlistPreview";
import { ChainTransactionsPanel } from "@/components/explorer/chain/ChainTransactionsPanel";
import { ChainExplorerHero } from "@/components/explorer/vrm/VrmChainHero";
import { VrmLeaderboardPreview } from "@/components/explorer/vrm/VrmLeaderboardPreview";
import { VrmMinersPreview } from "@/components/explorer/vrm/VrmMinersPreview";
import { useStableChainLive } from "@/hooks/useStableChainLive";
import type { ChainMarket, VrmDashboardPayload, VrmNetworkStats } from "@/lib/api/types";
import { fetchHomeMarket, fetchHomeNetwork } from "@/lib/api/client";
import { applyOnChainMarketCap } from "@/lib/enrichMarket";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";
import { resolveRichlistTotalSupply } from "@/lib/richlistSupply";

export function VrmChainDashboard({
  summary: initialSummary,
  richlist: initialRichlist,
  leaderboard: initialLeaderboard,
  miners: initialMiners,
  initialMarket,
  initialNetwork,
}: VrmDashboardPayload & {
  initialMarket?: ChainMarket;
  initialNetwork?: VrmNetworkStats;
}) {
  const [market, setMarket] = useState<ChainMarket>(
    initialMarket ?? emptyMarketPayload().vrm,
  );
  const [network, setNetwork] = useState<VrmNetworkStats>(
    initialNetwork ?? emptyNetworkPayload().vrm,
  );
  const {
    summary,
    chainHeight,
    addressCount,
    latestBlocks,
    heightPulse,
  } = useStableChainLive("vrm", initialSummary);

  useEffect(() => {
    if (initialMarket && initialNetwork) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [marketPayload, networkPayload] = await Promise.all([
          fetchHomeMarket(),
          fetchHomeNetwork(),
        ]);
        if (!cancelled) {
          setMarket(applyOnChainMarketCap(marketPayload.vrm, "vrm", networkPayload.vrm.supply));
          setNetwork(networkPayload.vrm);
        }
      } catch {
        /* keep empty defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialMarket, initialNetwork]);

  const tipBlock = latestBlocks[0];
  const tipBlockHref = tipBlock ? `/vrm/block/${tipBlock.height}` : null;
  const richlistSupply = resolveRichlistTotalSupply(network.supply, market);

  return (
    <div className="space-y-6">
      <ChainExplorerHero
        chainId="vrm"
        health={summary.health}
        chainHeight={chainHeight}
        heightPulse={heightPulse}
        tipBlock={tipBlock}
      />

      <ChainMetricStrip
        chainId="vrm"
        chainHeight={chainHeight}
        addressCount={addressCount}
        tipBlock={tipBlock}
        heightPulse={heightPulse}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainMarketCard chainId="vrm" market={market} />
        <ChainNetworkCard chainId="vrm" network={network} />
      </div>

      <LazyChainActivityChart chainId="vrm" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-stretch">
        <ChainBlocksPanel
          chainId="vrm"
          liveBlocks={latestBlocks.length > 0 ? latestBlocks : summary.latestBlocks}
          chainHeight={chainHeight}
          maxIndexedHeight={summary.health.heights.maxIndexedHeight}
        />
        <div className="flex flex-col gap-6">
          <ChainRichlistPreview
            chainId="vrm"
            richlist={initialRichlist}
            totalSupply={richlistSupply}
          />
          <VrmMinersPreview miners={initialMiners} />
          <VrmLeaderboardPreview leaderboard={initialLeaderboard} />
        </div>
      </div>

      <ChainTransactionsPanel chainId="vrm" transactions={summary.recentTransactions} />

      <ChainQuickNav chainId="vrm" tipBlockHref={tipBlockHref} />
    </div>
  );
}
