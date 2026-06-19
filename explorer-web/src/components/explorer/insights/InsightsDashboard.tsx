'use client';

import { InsightsPageHero } from '@/components/explorer/insights/InsightsPageHero';
import { ChainActivityInsightsChart } from '@/components/explorer/insights/ChainActivityInsightsChart';
import { InsightsKpiStrip } from '@/components/explorer/insights/InsightsKpiStrip';
import { InsightsMarketChart } from '@/components/explorer/insights/InsightsMarketChart';
import { InsightsNetworkCharts } from '@/components/explorer/insights/InsightsNetworkCharts';
import { useHomeMarket } from '@/hooks/useHomeMarket';
import { useHomeNetworkLive } from '@/hooks/useHomeNetworkLive';
import { useStableChainLive } from '@/hooks/useStableChainLive';
import type { ChainMarket, ChainSummary, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import { getChainAccentVar } from '@/lib/insightsChartConfig';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';
import { useRouter, useSearchParams } from 'next/navigation';

export function InsightsDashboard({
  chainId: initialChainId,
  summary,
  initialMarket,
  initialNetwork,
}: {
  chainId: 'vrm' | 'vrc';
  summary: ChainSummary;
  initialMarket?: ChainMarket;
  initialNetwork?: VrmNetworkStats | VrcNetworkStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chainId = searchParams.get('chain') === 'vrc' ? 'vrc' : initialChainId;
  const liveSummary = useStableChainLive(chainId, summary);
  const initialNetworkPayload =
    initialNetwork != null
      ? {
          fetchedAt: new Date().toISOString(),
          vrm: chainId === 'vrm' ? (initialNetwork as VrmNetworkStats) : emptyNetworkPayload().vrm,
          vrc: chainId === 'vrc' ? (initialNetwork as VrcNetworkStats) : emptyNetworkPayload().vrc,
        }
      : emptyNetworkPayload();
  const { network: networkPayload } = useHomeNetworkLive(initialNetworkPayload);
  const network = chainId === 'vrm' ? networkPayload.vrm : networkPayload.vrc;
  const initialMarketPayload =
    initialMarket != null
      ? {
          fetchedAt: new Date().toISOString(),
          vrm: chainId === 'vrm' ? initialMarket : emptyMarketPayload().vrm,
          vrc: chainId === 'vrc' ? initialMarket : emptyMarketPayload().vrc,
        }
      : emptyMarketPayload();
  const { vrmMarket, vrcMarket } = useHomeMarket(initialMarketPayload);
  const market = chainId === 'vrm' ? vrmMarket : vrcMarket;

  const setChain = (next: 'vrm' | 'vrc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chain', next);
    router.replace(`/insights?${params.toString()}`);
  };

  const live = liveSummary.summary.health.trusted;
  const chainAccent = getChainAccentVar(chainId);

  return (
    <div
      className="insights-page"
      data-chain={chainId}
      style={{ '--hub-accent': chainAccent } as React.CSSProperties}
    >
      <InsightsPageHero chainId={chainId} live={live} onChainChange={setChain} />

      <InsightsKpiStrip
        chainId={chainId}
        summary={liveSummary.summary}
        network={network}
        market={market}
      />

      <section aria-labelledby="insights-charts-heading">
        <h2 id="insights-charts-heading" className="chain-hub-section-label">
          Historical charts
        </h2>
        <div
          className="insights-chart-grid mt-4"
          style={{ '--insights-accent': chainAccent } as React.CSSProperties}
        >
          <InsightsNetworkCharts chainId={chainId} maxSupply={network.maxSupply} />
          <ChainActivityInsightsChart chainId={chainId} />
          <InsightsMarketChart chainId={chainId} />
        </div>
      </section>
    </div>
  );
}
