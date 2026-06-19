'use client';

import { useEffect, useState } from 'react';
import { ChainMarketCard } from '@/components/explorer/home/ChainMarketCard';
import { ChainNetworkCard } from '@/components/explorer/home/ChainNetworkCard';
import { ChainBlocksPanel } from '@/components/explorer/chain/ChainBlocksPanel';
import { ChainHubPageShell, ChainHubSection } from '@/components/explorer/chain/ChainHubPageShell';
import { LazyChainActivityChart } from '@/components/explorer/chain/LazyChainActivityChart';
import { ChainMetricStrip } from '@/components/explorer/chain/ChainMetricStrip';
import { ChainQuickNav } from '@/components/explorer/chain/ChainQuickNav';
import { ChainLeaderboardPreview } from '@/components/explorer/chain/ChainLeaderboardPreview';
import { ChainRichlistPreview } from '@/components/explorer/chain/ChainRichlistPreview';
import { ChainTransactionsPanel } from '@/components/explorer/chain/ChainTransactionsPanel';
import { ChainExplorerHero } from '@/components/explorer/vrm/VrmChainHero';
import { useStableChainLive } from '@/hooks/useStableChainLive';
import type {
  ChainMarket,
  ChainSummary,
  LeaderboardResult,
  RichlistResult,
  VrcNetworkStats,
} from '@/lib/api/types';
import { fetchHomeMarket, fetchHomeNetwork } from '@/lib/api/client';
import { applyOnChainMarketCap } from '@/lib/enrichMarket';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';
import { resolveRichlistTotalSupply } from '@/lib/richlistSupply';

export function VrcChainDashboard({
  summary: initialSummary,
  richlist: initialRichlist,
  leaderboard: initialLeaderboard,
  initialMarket,
  initialNetwork,
}: {
  summary: ChainSummary;
  richlist: RichlistResult;
  leaderboard: LeaderboardResult;
  initialMarket?: ChainMarket;
  initialNetwork?: VrcNetworkStats;
}) {
  const [market, setMarket] = useState<ChainMarket>(initialMarket ?? emptyMarketPayload().vrc);
  const [network, setNetwork] = useState<VrcNetworkStats>(
    initialNetwork ?? emptyNetworkPayload().vrc
  );
  const { summary, chainHeight, addressCount, latestBlocks, heightPulse } = useStableChainLive(
    'vrc',
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
          setMarket(applyOnChainMarketCap(marketPayload.vrc, 'vrc', networkPayload.vrc.supply));
          setNetwork(networkPayload.vrc);
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
  const tipBlockHref = tipBlock ? `/vrc/block/${tipBlock.height}` : null;
  const richlistSupply = resolveRichlistTotalSupply(network.supply, market);

  return (
    <ChainHubPageShell chainId="vrc">
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

      <ChainHubSection title="Market & network">
        <div className="chain-hub-grid-2">
          <ChainMarketCard chainId="vrc" market={market} />
          <ChainNetworkCard chainId="vrc" network={network} />
        </div>
      </ChainHubSection>

      <ChainHubSection title="Chain activity">
        <LazyChainActivityChart chainId="vrc" />
      </ChainHubSection>

      <ChainHubSection title="On-chain data">
        <div className="chain-hub-grid-main">
          <ChainBlocksPanel
            chainId="vrc"
            liveBlocks={latestBlocks}
            chainHeight={chainHeight}
            maxIndexedHeight={summary.health.heights.maxIndexedHeight}
          />
          <div className="chain-hub-sidebar">
            <ChainRichlistPreview
              chainId="vrc"
              richlist={initialRichlist}
              totalSupply={richlistSupply}
            />
            <ChainLeaderboardPreview chainId="vrc" leaderboard={initialLeaderboard} />
          </div>
        </div>
      </ChainHubSection>

      <ChainHubSection title="Recent transactions">
        <ChainTransactionsPanel chainId="vrc" transactions={summary.recentTransactions} />
      </ChainHubSection>

      <ChainHubSection title="Explore further">
        <ChainQuickNav chainId="vrc" tipBlockHref={tipBlockHref} />
      </ChainHubSection>
    </ChainHubPageShell>
  );
}
