'use client';

import dynamic from 'next/dynamic';
import type { ChainId } from '@/lib/chainDisplay';

function ActivityChartSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-xl border border-border bg-bg-subtle sm:h-80" />
  );
}

const ChainActivityChart = dynamic(
  () => import('./ChainActivityChart').then((module) => module.ChainActivityChart),
  { loading: () => <ActivityChartSkeleton />, ssr: false }
);

export function LazyChainActivityChart({ chainId }: { chainId: ChainId }) {
  return <ChainActivityChart chainId={chainId} />;
}
