"use client";

import { useChainTipState } from "@/components/explorer/TipStreamProvider";
import { useChainLiveSnapshot } from "@/lib/chainLive/useChainLiveSnapshot";
import type { ChainSummary } from "@/lib/api/types";
import {
  getChainSyncLabel,
  getChainTipHeight,
  isChainAtTip,
} from "@/lib/chainDisplay";

export function useChainSyncStatus(
  chainId: "vrm" | "vrc",
  initialSummary?: ChainSummary | null,
) {
  const liveSnapshot = useChainLiveSnapshot(chainId, initialSummary);
  const { height: streamTipHeight } = useChainTipState(chainId);
  const health = liveSnapshot.summary.health;
  const latestBlockHeight = liveSnapshot.latestBlocks[0]?.height ?? null;
  const loading =
    initialSummary == null && !liveSnapshot.summary.health.checks.hasBlocks;

  const liveTipHeight = streamTipHeight ?? health.heights.bestRpcHeight ?? null;
  const live = isChainAtTip(health, latestBlockHeight, liveTipHeight);
  const height = liveTipHeight ?? getChainTipHeight(health);
  const label =
    loading ? null : getChainSyncLabel(health, latestBlockHeight, liveTipHeight);

  return { live, height, label, loading };
}
