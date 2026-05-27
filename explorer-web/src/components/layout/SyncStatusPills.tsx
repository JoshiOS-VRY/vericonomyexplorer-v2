"use client";

import { SyncStatusPill } from "@/components/layout/SyncStatusPill";
import type { ChainSummary } from "@/lib/api/types";

export function SyncStatusPills({
  initialVrmSummary,
  initialVrcSummary,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <SyncStatusPill chainId="vrm" initialSummary={initialVrmSummary} />
      <SyncStatusPill chainId="vrc" initialSummary={initialVrcSummary} />
    </div>
  );
}
