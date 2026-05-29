"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RichlistBalanceList } from "@/components/explorer/home/RichlistBalanceList";
import { useHomeNetworkLive } from "@/hooks/useHomeNetworkLive";
import type {
  ChainSummary,
  HomeNetworkPayload,
  RichlistResult,
} from "@/lib/api/types";
import { CHAIN_EXPLORERS, chainAddressPath } from "@/lib/chainDisplay";
import { enrichHomeNetworkPayload } from "@/lib/enrichNetwork";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { emptyNetworkPayload } from "@/lib/homeDefaults";
import { cn } from "@/lib/utils";

interface VericonomyHomeRichlistsProps {
  vrmRichlist: RichlistResult;
  vrcRichlist: RichlistResult;
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  initialNetwork?: HomeNetworkPayload;
}

function resolveRichlistSupply(
  chainId: "vrm" | "vrc",
  network: HomeNetworkPayload,
  initialNetwork?: HomeNetworkPayload,
): number | null {
  const chainNetwork = chainId === "vrm" ? network.vrm : network.vrc;
  const initialChain = chainId === "vrm" ? initialNetwork?.vrm : initialNetwork?.vrc;
  const supply = chainNetwork.supply ?? initialChain?.supply ?? null;
  return supply != null && supply > 0 ? supply : null;
}

export function VericonomyHomeRichlists({
  vrmRichlist,
  vrcRichlist,
  vrmSummary,
  vrcSummary,
  initialNetwork,
}: VericonomyHomeRichlistsProps) {
  const { network } = useHomeNetworkLive(initialNetwork ?? emptyNetworkPayload());
  const enrichedNetwork = useMemo(
    () => enrichHomeNetworkPayload(network, vrmSummary, vrcSummary),
    [network, vrmSummary, vrcSummary],
  );

  const vrmSupply = resolveRichlistSupply("vrm", enrichedNetwork, initialNetwork);
  const vrcSupply = resolveRichlistSupply("vrc", enrichedNetwork, initialNetwork);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChainRichlistPanel richlist={vrmRichlist} totalSupply={vrmSupply} />
      <ChainRichlistPanel richlist={vrcRichlist} totalSupply={vrcSupply} />
    </div>
  );
}

function ChainRichlistPanel({
  richlist,
  totalSupply,
}: {
  richlist: RichlistResult;
  totalSupply: number | null;
}) {
  const config = CHAIN_EXPLORERS[richlist.chainId as "vrm" | "vrc"];
  if (!config) return null;

  const chainId = richlist.chainId as "vrm" | "vrc";
  const action =
    config.richlistHref && richlist.enabled !== false ? (
      <Link
        href={config.richlistHref}
        className={cn(
          "rounded-md px-2.5 py-1 text-sm font-semibold transition-colors hover:underline",
          chainId === "vrm" ? "text-[var(--chain-vrm)]" : "text-[var(--chain-vrc)]",
        )}
        prefetch
      >
        View all
      </Link>
    ) : null;

  return (
    <BcPanel
      title={`Top ${config.ticker} balances`}
      action={action}
      className={cn(
        "home-richlist-panel",
        chainId === "vrm" ? "home-richlist-panel--vrm" : "home-richlist-panel--vrc",
      )}
      flush
    >
      {!richlist.enabled && richlist.message ? (
        <p className="px-5 py-4 text-base text-fg-muted">
          {formatExplorerUserMessage(richlist.message)}
        </p>
      ) : richlist.items.length === 0 ? (
        <p className="px-5 py-4 text-base text-fg-muted">No ranked balances yet.</p>
      ) : (
        <RichlistBalanceList
          chainId={chainId}
          items={richlist.items}
          totalSupply={totalSupply}
          addressHref={(address) =>
            config.exploreHref ? chainAddressPath(chainId, address) : "#"
          }
        />
      )}
    </BcPanel>
  );
}
