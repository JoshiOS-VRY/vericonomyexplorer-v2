import Image from "next/image";
import { ChainExploreButton } from "@/components/explorer/home/ChainExploreButton";
import { StatusDot } from "@/components/explorer/ExplorerUi";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { cn } from "@/lib/utils";

interface BinaryChainHeroProps {
  vrmLive: boolean;
  vrcLive: boolean;
}

export function BinaryChainHero({ vrmLive, vrcLive }: BinaryChainHeroProps) {
  const vrm = CHAIN_EXPLORERS.vrm;
  const vrc = CHAIN_EXPLORERS.vrc;

  return (
    <section className="binary-chain-hero overflow-hidden rounded-xl border border-border bg-gradient-to-br from-bg-panel via-bg-panel to-accent/5 shadow-sm">
      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 -space-x-2 sm:flex">
              <Image
                src={vrm.logo}
                alt=""
                width={48}
                height={48}
                className="relative z-10 h-12 w-12 rounded-full border-2 border-bg-panel bg-bg-panel object-contain"
              />
              <Image
                src={vrc.logo}
                alt=""
                width={48}
                height={48}
                className="relative h-12 w-12 rounded-full border-2 border-bg-panel bg-bg-panel object-contain"
              />
            </div>
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider">
                VeriConomy Binary Chain block explorer
              </h5>

              <p className="mt-2 max-w-2xl text-sm text-fg-muted">
                Live market data, network stats, and on-chain activity for Verium
                (PoWT) and VeriCoin (PoST).
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <LiveBadge label={vrm.ticker} live={vrmLive} />
                <LiveBadge label={vrc.ticker} live={vrcLive} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ChainExploreButton chainId="vrm" />
            <ChainExploreButton chainId="vrc" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveBadge({ label, live }: { label: string; live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        live
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-bg-subtle text-fg-muted",
      )}
    >
      <StatusDot tone={live ? "success" : "neutral"} pulse={live} />
      {label} {live ? "Live" : "Offline"}
    </span>
  );
}
