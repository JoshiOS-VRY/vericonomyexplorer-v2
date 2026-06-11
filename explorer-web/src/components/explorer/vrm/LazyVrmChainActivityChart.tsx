'use client';

import dynamic from 'next/dynamic';

function ActivityChartSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-xl border border-border bg-bg-subtle sm:h-80" />
  );
}

export const LazyVrmChainActivityChart = dynamic(
  () => import('./VrmChainActivityChart').then((module) => module.VrmChainActivityChart),
  { loading: () => <ActivityChartSkeleton />, ssr: false }
);
