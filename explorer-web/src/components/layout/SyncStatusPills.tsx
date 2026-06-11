'use client';

import { SyncStatusPill } from '@/components/layout/SyncStatusPill';
import type { ChainSummary } from '@/lib/api/types';

export function SyncStatusPills({
  initialVrmSummary,
  initialVrcSummary,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  return (
    <div className="flex items-center">
      <SyncStatusPill chainId="vrm" initialSummary={initialVrmSummary} />
      <span className="mx-1 hidden h-px w-3 shrink-0 bg-border sm:block sm:w-4" aria-hidden />
      <SyncStatusPill chainId="vrc" initialSummary={initialVrcSummary} />
    </div>
  );
}
