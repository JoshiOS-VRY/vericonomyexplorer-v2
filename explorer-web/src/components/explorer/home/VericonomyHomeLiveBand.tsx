'use client';

import { BinaryChainHero } from '@/components/explorer/home/BinaryChainHero';
import { ChainHubSection } from '@/components/explorer/home/LatestBlocksChainStrip';
import { useDualChainLive } from '@/hooks/useDualChainLive';
import { useHomeMarket } from '@/hooks/useHomeMarket';
import { useHydrated } from '@/hooks/useHydrated';
import { useHomeNetworkLive } from '@/hooks/useHomeNetworkLive';
import type { HomeNetworkPayload, HomeShellPayload } from '@/lib/api/types';
import { isChainLive } from '@/lib/chainDisplay';
import { enrichHomeNetworkPayload } from '@/lib/enrichNetwork';
import { applyOnChainMarketCap } from '@/lib/enrichMarket';
import { emptyMarketPayload, emptyNetworkPayload } from '@/lib/homeDefaults';

interface VericonomyHomeLiveBandProps {
  initialShell: HomeShellPayload;
  initialNetwork?: HomeNetworkPayload;
}

export function VericonomyHomeLiveBand({
  initialShell,
  initialNetwork,
}: VericonomyHomeLiveBandProps) {
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
  const vrmLive = isChainLive(
    vrmSummary.health,
    vrmSummary.latestBlocks[0]?.height,
    live.vrm.chainHeight
  );
  const vrcLive = isChainLive(
    vrcSummary.health,
    vrcSummary.latestBlocks[0]?.height,
    live.vrc.chainHeight
  );

  return (
    <div className="home-live-band space-y-8">
      <BinaryChainHero vrmLive={vrmLive} vrcLive={vrcLive} />

      <div className="home-chain-grid grid items-stretch gap-6 xl:grid-cols-2">
        <ChainHubSection
          chainId="vrm"
          summary={vrmSummary}
          chainHeight={
            hydrated
              ? live.vrm.chainHeight
              : (initialShell.vrm.summary.health.heights.bestRpcHeight ??
                initialShell.vrm.summary.health.heights.maxIndexedHeight)
          }
          heightPulse={hydrated && live.vrm.heightPulse}
          market={market.vrm}
          network={network.vrm}
          seedBlocks={hydrated ? live.vrm.latestBlocks : initialShell.vrm.summary.latestBlocks}
        />
        <ChainHubSection
          chainId="vrc"
          summary={vrcSummary}
          chainHeight={
            hydrated
              ? live.vrc.chainHeight
              : (initialShell.vrc.summary.health.heights.bestRpcHeight ??
                initialShell.vrc.summary.health.heights.maxIndexedHeight)
          }
          heightPulse={hydrated && live.vrc.heightPulse}
          market={market.vrc}
          network={network.vrc}
          seedBlocks={hydrated ? live.vrc.latestBlocks : initialShell.vrc.summary.latestBlocks}
        />
      </div>
    </div>
  );
}
