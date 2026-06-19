import { Skeleton, SkeletonPanel, SkeletonStatGrid } from '@/components/ui/Skeleton';

function HubPanelSkeleton() {
  return (
    <div className="chain-hub-section overflow-hidden rounded-lg border border-border bg-bg-panel">
      <Skeleton className="h-16 w-full rounded-none" />
      <Skeleton className="mx-3 mt-3 h-12 w-full rounded-md" />
      <div className="border-y border-border">
        <Skeleton className="h-10 w-full rounded-none" />
      </div>
      <div className="p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-8 w-full" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-none" />
    </div>
  );
}

export function HomeLoadingSkeleton() {
  return (
    <div className="home-page">
      <div className="home-dashboard">
        <div className="home-chain-grid">
          <HubPanelSkeleton />
          <HubPanelSkeleton />
        </div>
        <div className="home-holders-grid">
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={5} />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function VrmLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <SkeletonStatGrid />
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonPanel rows={3} />
        <SkeletonPanel rows={3} />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SkeletonPanel />
        <div className="space-y-6">
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={5} />
        </div>
      </div>
    </div>
  );
}

export function AddressLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <SkeletonStatGrid />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonPanel rows={1} />
        </div>
        <SkeletonPanel rows={4} />
      </div>
      <SkeletonPanel rows={4} />
      <SkeletonPanel rows={6} />
    </div>
  );
}

export function BlockLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <SkeletonStatGrid />
      <SkeletonPanel rows={8} />
    </div>
  );
}

export function TxLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <SkeletonStatGrid />
      <SkeletonPanel rows={4} />
    </div>
  );
}

export function RichlistLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <SkeletonPanel rows={10} />
    </div>
  );
}

export function InsightsLoadingSkeleton() {
  return (
    <div className="insights-page space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="insights-kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SkeletonPanel rows={1} />
        <SkeletonPanel rows={1} />
        <SkeletonPanel rows={1} />
        <SkeletonPanel rows={1} />
      </div>
    </div>
  );
}
