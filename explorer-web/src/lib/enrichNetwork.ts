import type { ChainSummary, HomeNetworkPayload, VrcNetworkStats, VrmNetworkStats } from "@/lib/api/types";

function parseDifficulty(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chainHeight(summary: ChainSummary): number | null {
  return (
    summary.health.heights.bestRpcHeight ??
    summary.health.heights.maxIndexedHeight ??
    summary.latestBlocks[0]?.height ??
    null
  );
}

export function enrichVrmNetworkStats(
  network: VrmNetworkStats,
  summary: ChainSummary,
): VrmNetworkStats {
  const tip = summary.latestBlocks[0];

  return {
    ...network,
    difficulty: network.difficulty ?? parseDifficulty(tip?.difficulty),
    blocks: network.blocks ?? chainHeight(summary),
    supply: network.supply,
  };
}

export function enrichVrcNetworkStats(
  network: VrcNetworkStats,
  summary: ChainSummary,
): VrcNetworkStats {
  const tip = summary.latestBlocks[0];

  return {
    ...network,
    difficulty: network.difficulty ?? parseDifficulty(tip?.difficulty),
    blocks: network.blocks ?? chainHeight(summary),
    supply: network.supply,
  };
}

export function enrichHomeNetworkPayload(
  network: HomeNetworkPayload,
  vrmSummary: ChainSummary,
  vrcSummary: ChainSummary,
): HomeNetworkPayload {
  return {
    ...network,
    vrm: enrichVrmNetworkStats(network.vrm, vrmSummary),
    vrc: enrichVrcNetworkStats(network.vrc, vrcSummary),
  };
}

export function mergeVrmNetworkStats(
  prev: VrmNetworkStats,
  next: VrmNetworkStats,
): VrmNetworkStats {
  return {
    hashrateKhPerMin: next.hashrateKhPerMin ?? prev.hashrateKhPerMin,
    hashrate7dKhPerMin: next.hashrate7dKhPerMin ?? prev.hashrate7dKhPerMin,
    difficulty: next.difficulty ?? prev.difficulty,
    blocks: next.blocks ?? prev.blocks,
    supply: next.supply ?? prev.supply,
    maxSupply: next.maxSupply ?? prev.maxSupply,
  };
}

export function mergeVrcNetworkStats(
  prev: VrcNetworkStats,
  next: VrcNetworkStats,
): VrcNetworkStats {
  return {
    difficulty: next.difficulty ?? prev.difficulty,
    blocks: next.blocks ?? prev.blocks,
    supply: next.supply ?? prev.supply,
    maxSupply: next.maxSupply ?? prev.maxSupply,
    interestRatePercent: next.interestRatePercent ?? prev.interestRatePercent,
    netStakeWeight: next.netStakeWeight ?? prev.netStakeWeight,
    percentStaked: next.percentStaked ?? prev.percentStaked,
    expectedStakeTimeSeconds:
      next.expectedStakeTimeSeconds ?? prev.expectedStakeTimeSeconds,
  };
}

export function mergeHomeNetworkPayload(
  prev: HomeNetworkPayload,
  next: HomeNetworkPayload,
): HomeNetworkPayload {
  return {
    fetchedAt: next.fetchedAt || prev.fetchedAt,
    vrm: mergeVrmNetworkStats(prev.vrm, next.vrm),
    vrc: mergeVrcNetworkStats(prev.vrc, next.vrc),
  };
}
