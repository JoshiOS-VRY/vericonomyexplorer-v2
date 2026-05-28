import Image from "next/image";
import Link from "next/link";
import { StatusDot, formatHeight } from "@/components/explorer/ExplorerUi";
import type { ChainHealth, IndexedBlock } from "@/lib/api/types";
import { CHAIN_EXPLORERS, isChainLive } from "@/lib/chainDisplay";
import { cn } from "@/lib/utils";

export function ChainExplorerHero({
  chainId,
  health,
  chainHeight,
  heightPulse,
  tipBlock,
}: {
  chainId: "vrm" | "vrc";
  health: ChainHealth;
  chainHeight: number | null;
  heightPulse: boolean;
  tipBlock: IndexedBlock | undefined;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const live = isChainLive(health, tipBlock?.height);
  const tipHref =
    tipBlock && config.blockHref ? config.blockHref(tipBlock.height) : null;
  const chainLabel =
    chainId === "vrm" ? "Verium blockchain" : "VeriCoin blockchain";
  const description =
    chainId === "vrm"
      ? "Explore blocks, transactions, and addresses on the Verium proof-of-work-time chain."
      : "Explore blocks, transactions, and balances on the VeriCoin proof-of-stake-time chain.";

  return (
    <section className="wallet-panel overflow-hidden rounded-xl border border-border bg-gradient-to-br from-bg-panel via-bg-panel to-accent/5 shadow-sm">
      <div className="border-b border-border/70 px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src={config.logo}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border-2 border-bg-panel bg-bg-panel object-contain"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {chainLabel}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                  {config.name}
                </h1>
                <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                  {config.ticker}
                </span>
                <span className="text-xs text-fg-subtle">
                  {config.consensus}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-fg-muted">
                {description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                    live
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-bg-subtle text-fg-muted",
                  )}
                >
                  <StatusDot tone={live ? "success" : "neutral"} pulse={live} />
                  {live ? "Live" : "Offline"}
                </span>
                {chainHeight != null ? (
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums text-fg",
                      heightPulse && "live-height-pulse",
                    )}
                  >
                    Height {formatHeight(chainHeight)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use ChainExplorerHero with chainId="vrm" */
export function VrmChainHero({
  health,
  chainHeight,
  heightPulse,
  tipBlock,
}: {
  health: ChainHealth;
  chainHeight: number | null;
  heightPulse: boolean;
  tipBlock: IndexedBlock | undefined;
}) {
  return (
    <ChainExplorerHero
      chainId="vrm"
      health={health}
      chainHeight={chainHeight}
      heightPulse={heightPulse}
      tipBlock={tipBlock}
    />
  );
}
