'use client';

import { useMemo } from 'react';
import { HomeChainLane } from '@/components/explorer/home/HomeChainLane';
import { HomeHolderBoard } from '@/components/explorer/home/HomeHolderBoard';
import { HomeQuickLinks } from '@/components/explorer/home/HomeQuickLinks';
import { useDualChainLive } from '@/hooks/useDualChainLive';
import { useHomeMarket } from '@/hooks/useHomeMarket';
import { useHydrated } from '@/hooks/useHydrated';
import { useHomeNetworkLive } from '@/hooks/useHomeNetworkLive';
import type { HomeNetworkPayload, HomeShellPayload } from '@/lib/api/types';
import { enrichHomeNetworkPayload } from '@/lib/enrichNetwork';
import { applyOnChainMarketCap } from '@/lib/enrichMarket';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';
import { resolveRichlistTotalSupply } from '@/lib/richlistSupply';

interface HomeDashboardProps {
  initialShell: HomeShellPayload;
  initialNetwork?: HomeNetworkPayload;
}

function resolveSupply(
  chainId: 'vrm' | 'vrc',
  network: HomeNetworkPayload,
  initialNetwork?: HomeNetworkPayload
): number | null {
  const chainNetwork = chainId === 'vrm' ? network.vrm : network.vrc;
  const initialChain = chainId === 'vrm' ? initialNetwork?.vrm : initialNetwork?.vrc;
  const supply = chainNetwork.supply ?? initialChain?.supply ?? null;
  return supply != null && supply > 0 ? supply : null;
}

export function HomeDashboard({ initialShell, initialNetwork }: HomeDashboardProps) {
  const hydrated = useHydrated();
  const { vrmMarket, vrcMarket } = useHomeMarket(emptyMarketPayload());
  const live = useDualChainLive(initialShell.vrm.summary, initialShell.vrc.summary);
  const { network: liveNetwork } = useHomeNetworkLive(initialNetwork ?? emptyNetworkPayload());
  const network = enrichHomeNetworkPayload(liveNetwork, live.vrm.summary, live.vrc.summary);
  const market = {
    vrm: applyOnChainMarketCap(vrmMarket, 'vrm', network.vrm.supply),
    vrc: applyOnChainMarketCap(vrcMarket, 'vrc', network.vrc.supply),
  };

  const vrmSummary = hydrated ? live.vrm.summary : initialShell.vrm.summary;
  const vrcSummary = hydrated ? live.vrc.summary : initialShell.vrc.summary;

  const vrmHeight = hydrated
    ? live.vrm.chainHeight
    : (initialShell.vrm.summary.health.heights.bestRpcHeight ??
      initialShell.vrm.summary.health.heights.maxIndexedHeight);
  const vrcHeight = hydrated
    ? live.vrc.chainHeight
    : (initialShell.vrc.summary.health.heights.bestRpcHeight ??
      initialShell.vrc.summary.health.heights.maxIndexedHeight);

  const vrmSupply = useMemo(
    () => resolveRichlistTotalSupply(resolveSupply('vrm', network, initialNetwork), market.vrm),
    [network, initialNetwork, market.vrm]
  );
  const vrcSupply = useMemo(
    () => resolveRichlistTotalSupply(resolveSupply('vrc', network, initialNetwork), market.vrc),
    [network, initialNetwork, market.vrc]
  );

  return (
    <div className="home-dashboard">
      <div className="home-dashboard__lanes">
        <HomeChainLane
          chainId="vrm"
          summary={vrmSummary}
          chainHeight={vrmHeight}
          heightPulse={hydrated && live.vrm.heightPulse}
          market={market.vrm}
          network={network.vrm}
          seedBlocks={hydrated ? live.vrm.latestBlocks : initialShell.vrm.summary.latestBlocks}
        />
        <HomeChainLane
          chainId="vrc"
          summary={vrcSummary}
          chainHeight={vrcHeight}
          heightPulse={hydrated && live.vrc.heightPulse}
          market={market.vrc}
          network={network.vrc}
          seedBlocks={hydrated ? live.vrc.latestBlocks : initialShell.vrc.summary.latestBlocks}
        />
      </div>

      <section className="home-dashboard__holders" aria-labelledby="home-holders-heading">
        <h2 id="home-holders-heading" className="home-dashboard__section-title">
          Largest holders
        </h2>
        <div className="home-dashboard__holders-grid">
          <HomeHolderBoard richlist={initialShell.vrm.richlist} totalSupply={vrmSupply} />
          <HomeHolderBoard richlist={initialShell.vrc.richlist} totalSupply={vrcSupply} />
        </div>
      </section>

      <HomeQuickLinks />
    </div>
  );
}
