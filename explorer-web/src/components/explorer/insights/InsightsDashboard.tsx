'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BcPageHeader } from '@/components/explorer/BlockchairUi';
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
import { cn } from '@/lib/utils';

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
    <div className="insights-dashboard space-y-6">
      <BcPageHeader
        title="Insights"
        subtitle="Network metrics, chain activity, and market history"
        badge={
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
              live ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                live ? 'bg-success animate-pulse' : 'bg-warning'
              )}
            />
            {live ? 'Live' : 'Updating'}
          </span>
        }
        action={
          <div className="insights-chain-toggle inline-flex rounded-lg border border-border/80 bg-bg-subtle/80 p-0.5 backdrop-blur-sm">
            {(['vrm', 'vrc'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChain(item)}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all duration-200',
                  chainId === item
                    ? 'shadow-sm ring-1 ring-border/60'
                    : 'text-fg-muted hover:text-fg'
                )}
                style={
                  chainId === item
                    ? {
                        background: getChainAccentVar(item),
                        color: 'var(--chain-btn-fg)',
                      }
                    : undefined
                }
              >
                {item === 'vrm' ? 'Verium' : 'Vericoin'}
              </button>
            ))}
          </div>
        }
      />

      <InsightsKpiStrip
        chainId={chainId}
        summary={liveSummary.summary}
        network={network}
        market={market}
      />

      <div
        className="insights-chart-grid grid gap-5 xl:grid-cols-2"
        style={{ '--insights-accent': chainAccent } as React.CSSProperties}
      >
        <InsightsNetworkCharts chainId={chainId} maxSupply={network.maxSupply} />
        <ChainActivityInsightsChart chainId={chainId} />
        <InsightsMarketChart chainId={chainId} />
      </div>
    </div>
  );
}
