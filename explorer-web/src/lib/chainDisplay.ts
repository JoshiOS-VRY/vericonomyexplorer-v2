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

/** Latest indexed block height used for sync checks (falls back to health heights). */
export function getLatestIndexedHeight(
  health: ChainHealth,
  latestBlockHeight?: number | null,
): number | null {
  if (latestBlockHeight != null) return latestBlockHeight;
  const { lastIndexedHeight, maxIndexedHeight } = health.heights;
  return lastIndexedHeight ?? maxIndexedHeight;
}

/** True when the indexed tip matches the live chain tip height. */
export function isChainAtTip(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null,
): boolean {
  const tipHeight =
    health.heights.bestRpcHeight ?? liveTipHeight ?? getChainTipHeight(health);
  const indexedHeight = getLatestIndexedHeight(health, latestBlockHeight);

  if (tipHeight != null && indexedHeight != null) {
    return indexedHeight >= tipHeight;
  }

  const { blocksBehind } = health.heights;
  if (blocksBehind != null) return blocksBehind === 0;

  return false;
}

export function getChainSyncLabel(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null,
): "Live" | "Offline" {
  return isChainAtTip(health, latestBlockHeight, liveTipHeight)
    ? "Live"
    : "Offline";
}

export function getChainStatusTone(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null,
): "success" | "warning" | "neutral" {
  if (isChainAtTip(health, latestBlockHeight, liveTipHeight)) return "success";
  if (
    health.explorerStatus?.syncing ||
    (health.heights.blocksBehind ?? 0) > 0
  ) {
    return "warning";
  }
  return "neutral";
}

export function formatBlocksBehind(health: ChainHealth): string {
  const behind = health.heights.blocksBehind;
  if (behind == null) return "—";
  if (behind === 0) return "Up to date";
  return formatNumber(behind);
}

export function isChainLive(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null,
): boolean {
  return isChainAtTip(health, latestBlockHeight, liveTipHeight);
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
  blockHref: ((height: number) => string) | null;
};

/**
 * Verium: primary #46505a, secondary #84b4dd, ternary #586a7a, quaternary #418bca.
 * Vericoin: primary #418bca, secondary #032c57, ternary #eceeed.
 */
export const CHAIN_THEME: Record<
  "vrm" | "vrc",
  { accent: string; accentHover: string; accentFg: string; accentSoft: string }
> = {
  vrm: {
    accent: "rgb(70 80 90)",
    accentHover: "rgb(88 106 122)",
    accentFg: "rgb(255 255 255)",
    accentSoft: "rgb(132 180 221 / 0.14)",
  },
  vrc: {
    accent: "rgb(65 139 202)",
    accentHover: "rgb(3 44 87)",
    accentFg: "rgb(255 255 255)",
    accentSoft: "rgb(65 139 202 / 0.12)",
  },
};

export const CHAIN_EXPLORERS: Record<"vrm" | "vrc", ChainExplorerConfig> = {
  vrm: {
    id: "vrm",
    name: "Verium",
    ticker: "VRM",
    consensus: "Proof-of-Work-Time (Reserve)",
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
    consensus: "Proof-of-Stake-Time (Currency)",
    logo: "/img/vericonomy/vericoin-logo.svg",
    exploreHref: "/vrc",
    richlistHref: "/vrc/richlist",
    leaderboardHref: null,
    blockHref: (height) => `/vrc/block/${height}`,
  },
};

export type ChainId = "vrm" | "vrc";

export function chainBlockPath(
  chainId: ChainId,
  hashOrHeight: string | number,
) {
  return `/${chainId}/block/${hashOrHeight}`;
}

export function chainTxPath(chainId: ChainId, txid: string) {
  return `/${chainId}/tx/${txid}`;
}

export function chainAddressPath(chainId: ChainId, address: string) {
  return `/${chainId}/address/${encodeURIComponent(address)}`;
}

export function chainSummaryLabel(summary: ChainSummary): string {
  return (
    summary.health.name ??
    CHAIN_EXPLORERS[summary.chainId as "vrm" | "vrc"]?.name ??
    summary.chainId.toUpperCase()
  );
}
