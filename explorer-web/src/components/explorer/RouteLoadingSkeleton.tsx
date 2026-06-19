import { Skeleton, SkeletonPanel, SkeletonStatGrid } from '@/components/ui/Skeleton';

function LaneSkeleton() {
  return (
    <div className="space-y-4 pl-4">
      <Skeleton className="h-12 w-64" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-44 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function HomeLoadingSkeleton() {
  return (
    <div className="home-page">
      <div className="home-dashboard">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <LaneSkeleton />
        <LaneSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonPanel rows={5} />
          <SkeletonPanel rows={5} />
        </div>
        <Skeleton className="h-8 w-full max-w-xl" />
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
