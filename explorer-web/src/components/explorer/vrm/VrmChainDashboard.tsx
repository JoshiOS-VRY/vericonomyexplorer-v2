'use client';

import { useEffect, useState } from 'react';
import { ChainMarketCard } from '@/components/explorer/home/ChainMarketCard';
import { ChainNetworkCard } from '@/components/explorer/home/ChainNetworkCard';
import { ChainBlocksPanel } from '@/components/explorer/chain/ChainBlocksPanel';
import { ChainHubPageShell, ChainHubSection } from '@/components/explorer/chain/ChainHubPageShell';
import { LazyChainActivityChart } from '@/components/explorer/chain/LazyChainActivityChart';
import { ChainMetricStrip } from '@/components/explorer/chain/ChainMetricStrip';
import { ChainQuickNav } from '@/components/explorer/chain/ChainQuickNav';
import { ChainRichlistPreview } from '@/components/explorer/chain/ChainRichlistPreview';
import { ChainTransactionsPanel } from '@/components/explorer/chain/ChainTransactionsPanel';
import { ChainExplorerHero } from '@/components/explorer/vrm/VrmChainHero';
import { ChainLeaderboardPreview } from '@/components/explorer/chain/ChainLeaderboardPreview';
import { VrmMinersPreview } from '@/components/explorer/vrm/VrmMinersPreview';
import { useStableChainLive } from '@/hooks/useStableChainLive';
import type { ChainMarket, VrmDashboardPayload, VrmNetworkStats } from '@/lib/api/types';
import { fetchHomeMarket, fetchHomeNetwork } from '@/lib/api/client';
import { applyOnChainMarketCap } from '@/lib/enrichMarket';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';
import { resolveRichlistTotalSupply } from '@/lib/richlistSupply';

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
  const [market, setMarket] = useState<ChainMarket>(initialMarket ?? emptyMarketPayload().vrm);
  const [network, setNetwork] = useState<VrmNetworkStats>(
    initialNetwork ?? emptyNetworkPayload().vrm
  );
  const { summary, chainHeight, addressCount, latestBlocks, heightPulse } = useStableChainLive(
    'vrm',
    initialSummary
  );

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
          setMarket(applyOnChainMarketCap(marketPayload.vrm, 'vrm', networkPayload.vrm.supply));
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
    <ChainHubPageShell chainId="vrm">
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
        network={network}
      />

      <ChainHubSection title="Market & network">
        <div className="chain-hub-grid-2">
          <ChainMarketCard chainId="vrm" market={market} />
          <ChainNetworkCard chainId="vrm" network={network} />
        </div>
      </ChainHubSection>

      <ChainHubSection title="Chain activity">
        <LazyChainActivityChart chainId="vrm" />
      </ChainHubSection>

      <ChainHubSection title="On-chain data">
        <div className="chain-hub-grid-main">
          <ChainBlocksPanel
            chainId="vrm"
            liveBlocks={latestBlocks.length > 0 ? latestBlocks : summary.latestBlocks}
            chainHeight={chainHeight}
            maxIndexedHeight={summary.health.heights.maxIndexedHeight}
          />
          <div className="chain-hub-sidebar">
            <ChainRichlistPreview
              chainId="vrm"
              richlist={initialRichlist}
              totalSupply={richlistSupply}
            />
            <VrmMinersPreview miners={initialMiners} />
            <ChainLeaderboardPreview chainId="vrm" leaderboard={initialLeaderboard} />
          </div>
        </div>
      </ChainHubSection>

      <ChainHubSection title="Recent transactions">
        <ChainTransactionsPanel chainId="vrm" transactions={summary.recentTransactions} />
      </ChainHubSection>

      <ChainHubSection title="Explore further">
        <ChainQuickNav chainId="vrm" tipBlockHref={tipBlockHref} />
      </ChainHubSection>
    </ChainHubPageShell>
  );
}
