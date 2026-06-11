'use client';

import dynamic from 'next/dynamic';

function SparklineSkeleton() {
  return <div className="h-16 w-full animate-pulse rounded-md bg-bg-subtle" />;
}

export const LazyPriceSparkline = dynamic(
  () => import('./PriceSparkline').then((module) => module.PriceSparkline),
  { loading: () => <SparklineSkeleton />, ssr: false }
);
