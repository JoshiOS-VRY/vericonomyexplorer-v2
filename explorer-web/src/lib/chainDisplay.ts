import type { ChainHealth, ChainSummary } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

export function getChainTipHeight(health: ChainHealth): number | null {
  const { bestRpcHeight, maxIndexedHeight } = health.heights;
  if (bestRpcHeight != null) return bestRpcHeight;
  if (maxIndexedHeight != null) return maxIndexedHeight;
  return null;
}

export function getChainStatusLabel(health: ChainHealth): string {
  return health.explorerStatus?.label ?? health.status;
}

export function getChainStatusTone(
  health: ChainHealth,
): "success" | "warning" | "neutral" {
  const label = getChainStatusLabel(health).toLowerCase();
  if (health.explorerStatus?.syncing || label.includes("sync")) return "warning";
  if (label.includes("live") || label.includes("online")) return "success";
  return "neutral";
}

export function formatBlocksBehind(health: ChainHealth): string {
  const behind = health.heights.blocksBehind;
  if (behind == null) return "—";
  if (behind === 0) return "At tip";
  return formatNumber(behind);
}

export type ChainExplorerConfig = {
  id: "vrm" | "vrc";
  name: string;
  ticker: string;
  consensus: string;
  logo: string;
  exploreHref: string | null;
  richlistHref: string | null;
  leaderboardHref: string | null;
  blockHref: (height: number) => string | null;
};

export const CHAIN_EXPLORERS: Record<"vrm" | "vrc", ChainExplorerConfig> = {
  vrm: {
    id: "vrm",
    name: "Verium",
    ticker: "VRM",
    consensus: "PoWT",
    logo: "/img/vericonomy/verium-logo.svg",
    exploreHref: "/vrm",
    richlistHref: "/vrm/richlist",
    leaderboardHref: "/vrm/leaderboard?period=month&sort=activity",
    blockHref: (height) => `/vrm/block/${height}`,
  },
  vrc: {
    id: "vrc",
    name: "VeriCoin",
    ticker: "VRC",
    consensus: "PoST",
    logo: "/img/vericonomy/vericoin-logo.svg",
    exploreHref: null,
    richlistHref: null,
    leaderboardHref: null,
    blockHref: null,
  },
};

export function chainSummaryLabel(summary: ChainSummary): string {
  return summary.health.name ?? CHAIN_EXPLORERS[summary.chainId as "vrm" | "vrc"]?.name ?? summary.chainId.toUpperCase();
}
