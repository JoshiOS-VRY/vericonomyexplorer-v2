"use client";

import { BinaryChainActivity } from "@/components/explorer/home/BinaryChainActivity";
import { BinaryChainHero } from "@/components/explorer/home/BinaryChainHero";
import { ChainSummaryCard } from "@/components/explorer/home/ChainSummaryCard";
import {
  LiveBlocksFeed,
  NewBlockToast,
} from "@/components/explorer/home/LiveBlocksFeed";
import { useDualChainLive } from "@/hooks/useDualChainLive";
import { useHydrated } from "@/hooks/useHydrated";
import { useHomeNetworkLive } from "@/hooks/useHomeNetworkLive";
import type { HomeMarketPayload, HomeNetworkPayload, HomeShellPayload } from "@/lib/api/types";
import { isChainLive } from "@/lib/chainDisplay";
import { enrichHomeNetworkPayload } from "@/lib/enrichNetwork";

interface VericonomyHomeLiveBandProps {
  initialShell: HomeShellPayload;
  market: HomeMarketPayload;
  network: HomeNetworkPayload;
}

export function VericonomyHomeLiveBand({
  initialShell,
  market,
  network: initialNetwork,
}: VericonomyHomeLiveBandProps) {
  const hydrated = useHydrated();
  const live = useDualChainLive(
    initialShell.vrm.summary,
    initialShell.vrc.summary,
  );
  const { network: liveNetwork } = useHomeNetworkLive(initialNetwork);
  const network = enrichHomeNetworkPayload(
    liveNetwork,
    live.vrm.summary,
    live.vrc.summary,
  );

  const vrmSummary = hydrated ? live.vrm.summary : initialShell.vrm.summary;
  const vrcSummary = hydrated ? live.vrc.summary : initialShell.vrc.summary;
  const vrmLive = isChainLive(vrmSummary.health, vrmSummary.latestBlocks[0]?.height);
  const vrcLive = isChainLive(vrcSummary.health, vrcSummary.latestBlocks[0]?.height);

  const toastChainId: "vrm" | "vrc" | null = live.vrm.toastBlock
    ? "vrm"
    : live.vrc.toastBlock
      ? "vrc"
      : null;

  return (
    <div className="space-y-8">
      {live.toastBlock && toastChainId ? (
        <NewBlockToast block={live.toastBlock} chainId={toastChainId} />
      ) : null}

      <BinaryChainHero vrmLive={vrmLive} vrcLive={vrcLive} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainSummaryCard
          chainId="vrm"
          summary={live.vrm.summary}
          heightPulse={live.vrm.heightPulse}
          chainHeight={live.vrm.chainHeight}
          market={market.vrm}
          network={network.vrm}
        />
        <ChainSummaryCard
          chainId="vrc"
          summary={live.vrc.summary}
          heightPulse={live.vrc.heightPulse}
          chainHeight={live.vrc.chainHeight}
          market={market.vrc}
          network={network.vrc}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LiveBlocksFeed
          chainId="vrm"
          blocks={live.vrm.latestBlocks}
          newBlockHashes={live.vrm.newBlockHashes}
        />
        <LiveBlocksFeed
          chainId="vrc"
          blocks={live.vrc.latestBlocks}
          newBlockHashes={live.vrc.newBlockHashes}
        />
      </div>

      <BinaryChainActivity
        vrmSummary={live.vrm.summary}
        vrcSummary={live.vrc.summary}
      />
    </div>
  );
}
