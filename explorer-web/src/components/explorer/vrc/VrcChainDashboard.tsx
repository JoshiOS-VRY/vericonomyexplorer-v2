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
import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { ChainMarket, ChainSummary, RichlistResult, VrcNetworkStats } from "@/lib/api/types";
import { fetchHomeMarket, fetchHomeNetwork } from "@/lib/api/client";
import { applyOnChainMarketCap } from "@/lib/enrichMarket";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";

export function VrcChainDashboard({
  summary: initialSummary,
  richlist: initialRichlist,
}: {
  summary: ChainSummary;
  richlist: RichlistResult;
}) {
  const [market, setMarket] = useState<ChainMarket>(emptyMarketPayload().vrc);
  const [network, setNetwork] = useState<VrcNetworkStats>(emptyNetworkPayload().vrc);
  const live = useLiveChainSummary("vrc", initialSummary);
  const {
    summary,
    chainHeight,
    addressCount,
    latestBlocks,
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
          setMarket(applyOnChainMarketCap(marketPayload.vrc, "vrc", networkPayload.vrc.supply));
          setNetwork(networkPayload.vrc);
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
  const tipBlockHref = tipBlock ? `/vrc/block/${tipBlock.height}` : null;

  return (
    <div className="space-y-6">
      <ChainExplorerHero
        chainId="vrc"
        health={summary.health}
        chainHeight={chainHeight}
        heightPulse={heightPulse}
        tipBlock={tipBlock}
      />

      <ChainMetricStrip
        chainId="vrc"
        chainHeight={chainHeight}
        addressCount={addressCount}
        tipBlock={tipBlock}
        heightPulse={heightPulse}
        network={network}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainMarketCard chainId="vrc" market={market} />
        <ChainNetworkCard chainId="vrc" network={network} />
      </div>

      <LazyChainActivityChart chainId="vrc" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-stretch">
        <ChainBlocksPanel
          chainId="vrc"
          liveBlocks={latestBlocks}
          chainHeight={chainHeight}
          maxIndexedHeight={summary.health.heights.maxIndexedHeight}
        />
        <ChainRichlistPreview
          chainId="vrc"
          richlist={initialRichlist}
          totalSupply={network.supply}
        />
      </div>

      <ChainTransactionsPanel chainId="vrc" transactions={summary.recentTransactions} />

      <ChainQuickNav chainId="vrc" tipBlockHref={tipBlockHref} />
    </div>
  );
}
