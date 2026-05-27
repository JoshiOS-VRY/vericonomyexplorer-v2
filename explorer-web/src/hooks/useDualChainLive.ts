"use client";

import { useLiveChainSummary } from "@/hooks/useLiveChainSummary";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";

export interface DualChainLiveState {
  vrm: ReturnType<typeof useLiveChainSummary>;
  vrc: ReturnType<typeof useLiveChainSummary>;
  toastBlock: IndexedBlock | null;
}

export function useDualChainLive(
  initialVrmSummary: ChainSummary,
  initialVrcSummary: ChainSummary,
): DualChainLiveState {
  const vrm = useLiveChainSummary("vrm", initialVrmSummary);
  const vrc = useLiveChainSummary("vrc", initialVrcSummary);

  const toastBlock = vrm.toastBlock ?? vrc.toastBlock;

  return { vrm, vrc, toastBlock };
}
