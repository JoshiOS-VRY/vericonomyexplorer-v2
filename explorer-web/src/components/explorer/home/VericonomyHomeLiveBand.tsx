"use client";

import { BinaryChainActivity } from "@/components/explorer/home/BinaryChainActivity";
import { BinaryChainHero } from "@/components/explorer/home/BinaryChainHero";
import { NewBlockToast } from "@/components/explorer/home/LiveBlocksFeed";
import { ChainHubSection } from "@/components/explorer/home/LatestBlocksChainStrip";
import { useDualChainLive } from "@/hooks/useDualChainLive";
import { useHomeMarket } from "@/hooks/useHomeMarket";
import { useHydrated } from "@/hooks/useHydrated";
import { useHomeNetworkLive } from "@/hooks/useHomeNetworkLive";
import type { HomeShellPayload } from "@/lib/api/types";
import { isChainLive } from "@/lib/chainDisplay";
import { enrichHomeNetworkPayload } from "@/lib/enrichNetwork";
import { emptyMarketPayload, emptyNetworkPayload } from "@/lib/homeDefaults";

interface VericonomyHomeLiveBandProps {
  initialShell: HomeShellPayload;
}

export function VericonomyHomeLiveBand({
  initialShell,
}: VericonomyHomeLiveBandProps) {
  const hydrated = useHydrated();
  const { vrmMarket, vrcMarket } = useHomeMarket(emptyMarketPayload());
  const live = useDualChainLive(
    initialShell.vrm.summary,
    initialShell.vrc.summary,
  );
  const { network: liveNetwork } = useHomeNetworkLive(emptyNetworkPayload());
  const network = enrichHomeNetworkPayload(
    liveNetwork,
    live.vrm.summary,
    live.vrc.summary,
  );
  const market = { vrm: vrmMarket, vrc: vrcMarket };

  const vrmSummary = hydrated ? live.vrm.summary : initialShell.vrm.summary;
  const vrcSummary = hydrated ? live.vrc.summary : initialShell.vrc.summary;
  const vrmLive = isChainLive(
    vrmSummary.health,
    vrmSummary.latestBlocks[0]?.height,
  );
  const vrcLive = isChainLive(
    vrcSummary.health,
    vrcSummary.latestBlocks[0]?.height,
  );

  const toastChainId: "vrm" | "vrc" | null = live.vrm.toastBlock
    ? "vrm"
    : live.vrc.toastBlock
      ? "vrc"
      : null;

  return (
    <div className="space-y-5">
      {live.toastBlock && toastChainId ? (
        <NewBlockToast block={live.toastBlock} chainId={toastChainId} />
      ) : null}

      <BinaryChainHero vrmLive={vrmLive} vrcLive={vrcLive} />

      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        <ChainHubSection
          chainId="vrm"
          summary={live.vrm.summary}
          chainHeight={live.vrm.chainHeight}
          heightPulse={live.vrm.heightPulse}
          market={market.vrm}
          network={network.vrm}
          blocks={live.vrm.latestBlocks}
          newBlockHashes={live.vrm.newBlockHashes}
        />
        <ChainHubSection
          chainId="vrc"
          summary={live.vrc.summary}
          chainHeight={live.vrc.chainHeight}
          heightPulse={live.vrc.heightPulse}
          market={market.vrc}
          network={network.vrc}
          blocks={live.vrc.latestBlocks}
          newBlockHashes={live.vrc.newBlockHashes}
        />
      </div>
    </div>
  );
}
