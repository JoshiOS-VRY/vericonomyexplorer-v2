import type { ChainHealth, ChainSummary } from '@/lib/api/types';
import { formatNumber } from '@/lib/utils';

function maxHeight(...values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  return nums.length > 0 ? Math.max(...nums) : null;
}

export function getChainTipHeight(health: ChainHealth): number | null {
  const { bestRpcHeight, maxIndexedHeight, lastIndexedHeight } = health.heights;
  const tip = Math.max(
    bestRpcHeight ?? Number.NEGATIVE_INFINITY,
    maxIndexedHeight ?? Number.NEGATIVE_INFINITY,
    lastIndexedHeight ?? Number.NEGATIVE_INFINITY
  );
  return tip > Number.NEGATIVE_INFINITY ? tip : null;
}

export function getChainStatusLabel(health: ChainHealth): string {
  return health.explorerStatus?.label ?? health.status;
}

/** Latest indexed block height used for sync checks (falls back to health heights). */
export function getLatestIndexedHeight(
  health: ChainHealth,
  latestBlockHeight?: number | null
): number | null {
  const { lastIndexedHeight, maxIndexedHeight } = health.heights;
  const fromHealth = Math.max(
    lastIndexedHeight ?? Number.NEGATIVE_INFINITY,
    maxIndexedHeight ?? Number.NEGATIVE_INFINITY
  );
  const healthHeight = fromHealth > Number.NEGATIVE_INFINITY ? fromHealth : null;

  if (healthHeight != null && latestBlockHeight != null) {
    return Math.max(healthHeight, latestBlockHeight);
  }

  if (latestBlockHeight != null) {
    return latestBlockHeight;
  }

  return healthHeight;
}

function getTipThreshold(health: ChainHealth): number {
  return health.heights.tipThreshold ?? 10;
}

function isWithinTipThreshold(health: ChainHealth, blocksBehind: number | null): boolean {
  return blocksBehind != null && blocksBehind >= 0 && blocksBehind <= getTipThreshold(health);
}

/** Preserve live sync signals when poll responses regress between block events. */
export function mergeChainHealth(
  prev: ChainHealth,
  next: ChainHealth,
  latestBlockHeight?: number | null
): ChainHealth {
  const threshold = getTipThreshold(next);
  const bestRpcHeight = maxHeight(
    prev.heights.bestRpcHeight,
    next.heights.bestRpcHeight,
    latestBlockHeight
  );
  const lastIndexedHeight = maxHeight(
    prev.heights.lastIndexedHeight,
    next.heights.lastIndexedHeight,
    latestBlockHeight
  );
  const maxIndexedHeight = maxHeight(
    prev.heights.maxIndexedHeight,
    next.heights.maxIndexedHeight,
    latestBlockHeight
  );
  const blocksBehind =
    bestRpcHeight != null && lastIndexedHeight != null
      ? Math.max(0, bestRpcHeight - lastIndexedHeight)
      : (next.heights.blocksBehind ?? prev.heights.blocksBehind ?? null);
  const nearTip =
    next.checks?.nearTip === true ||
    prev.checks?.nearTip === true ||
    isWithinTipThreshold(next, blocksBehind);
  const hasRpcTip =
    next.checks?.hasRpcTip === true || prev.checks?.hasRpcTip === true || bestRpcHeight != null;

  let explorerStatus = next.explorerStatus ?? prev.explorerStatus;
  if (nearTip && explorerStatus?.label === 'Offline') {
    if (blocksBehind === 0) {
      explorerStatus = {
        label: 'Live',
        message: 'Up to date.',
        syncing: false,
        blocksBehind: 0,
      };
    } else if (blocksBehind != null && blocksBehind > 0) {
      explorerStatus = {
        label: 'Updating',
        message: `${blocksBehind.toLocaleString()} block${blocksBehind === 1 ? '' : 's'} behind the latest block.`,
        syncing: true,
        blocksBehind,
      };
    }
  }

  return {
    ...next,
    checks: {
      ...prev.checks,
      ...next.checks,
      nearTip,
      hasRpcTip,
    },
    heights: {
      ...next.heights,
      bestRpcHeight,
      lastIndexedHeight,
      maxIndexedHeight,
      blocksBehind,
      tipThreshold: threshold,
    },
    explorerStatus,
  };
}

/** True when the indexed tip matches the live chain tip height. */
export function isChainAtTip(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null
): boolean {
  if (health.checks?.nearTip === true) {
    return true;
  }

  if (isWithinTipThreshold(health, health.heights.blocksBehind)) {
    return true;
  }

  const indexedHeight = getLatestIndexedHeight(health, latestBlockHeight);
  const candidateTips = [
    liveTipHeight,
    indexedHeight,
    health.heights.bestRpcHeight,
    getChainTipHeight(health),
  ].filter((height): height is number => height != null && Number.isFinite(height));

  if (indexedHeight != null && candidateTips.length > 0) {
    const effectiveTip = Math.max(...candidateTips);
    if (indexedHeight >= effectiveTip) {
      return true;
    }

    const behind = effectiveTip - indexedHeight;
    if (isWithinTipThreshold(health, behind)) {
      return true;
    }
  }

  if (health.heights.blocksBehind != null) {
    return health.heights.blocksBehind === 0;
  }

  return false;
}

export function getChainSyncLabel(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null
): 'Live' | 'Offline' {
  return isChainAtTip(health, latestBlockHeight, liveTipHeight) ? 'Live' : 'Offline';
}

export function getChainStatusTone(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null
): 'success' | 'warning' | 'neutral' {
  if (isChainAtTip(health, latestBlockHeight, liveTipHeight)) return 'success';
  if (health.explorerStatus?.syncing || (health.heights.blocksBehind ?? 0) > 0) {
    return 'warning';
  }
  return 'neutral';
}

export function formatBlocksBehind(health: ChainHealth): string {
  const behind = health.heights.blocksBehind;
  if (behind == null) return '—';
  if (behind === 0) return 'Up to date';
  return formatNumber(behind);
}

export function isChainLive(
  health: ChainHealth,
  latestBlockHeight?: number | null,
  liveTipHeight?: number | null
): boolean {
  return isChainAtTip(health, latestBlockHeight, liveTipHeight);
}

export type ChainExplorerConfig = {
  id: 'vrm' | 'vrc';
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
  'vrm' | 'vrc',
  { accent: string; accentHover: string; accentFg: string; accentSoft: string }
> = {
  vrm: {
    accent: 'rgb(70 80 90)',
    accentHover: 'rgb(88 106 122)',
    accentFg: 'rgb(255 255 255)',
    accentSoft: 'rgb(132 180 221 / 0.14)',
  },
  vrc: {
    accent: 'rgb(65 139 202)',
    accentHover: 'rgb(3 44 87)',
    accentFg: 'rgb(255 255 255)',
    accentSoft: 'rgb(65 139 202 / 0.12)',
  },
};

export const CHAIN_EXPLORERS: Record<'vrm' | 'vrc', ChainExplorerConfig> = {
  vrm: {
    id: 'vrm',
    name: 'Verium',
    ticker: 'VRM',
    consensus: 'Proof-of-Work-Time (Reserve)',
    logo: '/img/vericonomy/verium-logo.svg',
    exploreHref: '/vrm',
    richlistHref: '/vrm/richlist',
    leaderboardHref: '/vrm/leaderboard?period=month&sort=activity',
    blockHref: (height) => `/vrm/block/${height}`,
  },
  vrc: {
    id: 'vrc',
    name: 'VeriCoin',
    ticker: 'VRC',
    consensus: 'Proof-of-Stake-Time (Currency)',
    logo: '/img/vericonomy/vericoin-logo.svg',
    exploreHref: '/vrc',
    richlistHref: '/vrc/richlist',
    leaderboardHref: null,
    blockHref: (height) => `/vrc/block/${height}`,
  },
};

export type ChainId = 'vrm' | 'vrc';

export function chainBlockPath(chainId: ChainId, hashOrHeight: string | number) {
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
    CHAIN_EXPLORERS[summary.chainId as 'vrm' | 'vrc']?.name ??
    summary.chainId.toUpperCase()
  );
}
