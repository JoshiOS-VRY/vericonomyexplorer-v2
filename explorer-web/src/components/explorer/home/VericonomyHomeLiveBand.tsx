"use client";

import { BinaryChainActivity } from "@/components/explorer/home/BinaryChainActivity";
import { BinaryChainHero } from "@/components/explorer/home/BinaryChainHero";
import { ChainSummaryCard } from "@/components/explorer/home/ChainSummaryCard";
import {
  LiveBlocksFeed,
  NewBlockToast,
} from "@/components/explorer/home/LiveBlocksFeed";
import { useDualChainLive } from "@/hooks/useDualChainLive";
import { useHomeNetworkLive } from "@/hooks/useHomeNetworkLive";
import type { HomeMarketPayload, HomeNetworkPayload, HomeShellPayload } from "@/lib/api/types";
import { isChainLive } from "@/lib/chainDisplay";

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
  const live = useDualChainLive(
    initialShell.vrm.summary,
    initialShell.vrc.summary,
  );
  const { network: liveNetwork } = useHomeNetworkLive(initialNetwork);

  const vrmLive = isChainLive(live.vrm.summary.health);
  const vrcLive = isChainLive(live.vrc.summary.health);

  const toastChainId: "vrm" | "vrc" | null = live.vrm.toastBlock
    ? "vrm"
    : live.vrc.toastBlock
      ? "vrc"
      : null;

  const recentBlocks = {
    vrm: live.vrm.latestBlocks,
    vrc: live.vrc.latestBlocks,
  };

  return (
    <div className="space-y-8">
      {live.toastBlock && toastChainId ? (
        <NewBlockToast block={live.toastBlock} chainId={toastChainId} />
      ) : null}

      <BinaryChainHero
        vrmLive={vrmLive}
        vrcLive={vrcLive}
        recentBlocks={recentBlocks}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainSummaryCard
          chainId="vrm"
          summary={live.vrm.summary}
          heightPulse={live.vrm.heightPulse}
          chainHeight={live.vrm.chainHeight}
          market={market.vrm}
          network={liveNetwork.vrm}
        />
        <ChainSummaryCard
          chainId="vrc"
          summary={live.vrc.summary}
          heightPulse={live.vrc.heightPulse}
          chainHeight={live.vrc.chainHeight}
          market={market.vrc}
          network={liveNetwork.vrc}
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
