"use client";

import { BcStat, BcStatGrid } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type {
  ChainMarket,
  ChainSummary,
  VrcNetworkStats,
  VrmNetworkStats,
} from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { formatSupply } from "@/lib/formatMarket";
import { getChainAccentVar } from "@/lib/insightsChartConfig";
import { formatDifficulty, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function InsightsKpiStrip({
  chainId,
  summary,
  network,
  market,
}: {
  chainId: "vrm" | "vrc";
  summary: ChainSummary;
  network: VrmNetworkStats | VrcNetworkStats;
  market: ChainMarket;
}) {
  const health = summary.health;
  const accent = getChainAccentVar(chainId);
  const ticker = CHAIN_EXPLORERS[chainId].ticker;

  const tiles = [
    {
      label: "Block height",
      value: formatHeight(network.blocks ?? health.heights.lastIndexedHeight ?? health.heights.maxIndexedHeight),
    },
    {
      label: "Addresses",
      value: formatHeight(health.counts.addressCount ?? 0),
    },
    {
      label: "Supply",
      value: formatSupply(network.supply, ticker),
    },
    {
      label: "Difficulty",
      value: network.difficulty != null ? formatDifficulty(String(network.difficulty)) : "—",
    },
    chainId === "vrm"
      ? {
          label: "Hashrate",
          value:
            (network as VrmNetworkStats).hashrateKhPerMin != null
              ? `${formatNumber((network as VrmNetworkStats).hashrateKhPerMin!)} kH/min`
              : "—",
        }
      : {
          label: "Interest",
          value:
            (network as VrcNetworkStats).interestRatePercent != null
              ? `${(network as VrcNetworkStats).interestRatePercent!.toFixed(2)}%`
              : "—",
        },
    {
      label: "Price (USD)",
      value:
        market.usd != null
          ? `$${market.usd.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
          : "—",
    },
  ];

  return (
    <BcStatGrid className="insights-kpi-strip gap-3 rounded-xl border border-border/80 bg-bg-panel/80 p-3 shadow-sm backdrop-blur-sm sm:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            "insights-kpi-tile relative overflow-hidden rounded-lg border border-border/60 bg-bg-subtle/40 px-3 py-2.5",
          )}
          style={{
            boxShadow: `inset 3px 0 0 color-mix(in srgb, ${accent} 70%, transparent)`,
          }}
        >
          <BcStat label={tile.label} value={tile.value} />
        </div>
      ))}
    </BcStatGrid>
  );
}
