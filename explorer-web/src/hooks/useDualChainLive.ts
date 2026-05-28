"use client";

import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { ChainSummary } from "@/lib/api/types";

export interface DualChainLiveState {
  vrm: ReturnType<typeof useLiveChainSummary>;
  vrc: ReturnType<typeof useLiveChainSummary>;
}

export function useDualChainLive(
  initialVrmSummary: ChainSummary,
  initialVrcSummary: ChainSummary,
): DualChainLiveState {
  const vrm = useLiveChainSummary("vrm", initialVrmSummary);
  const vrc = useLiveChainSummary("vrc", initialVrcSummary);

  return { vrm, vrc };
}
