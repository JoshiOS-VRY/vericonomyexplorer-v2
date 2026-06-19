import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} aria-hidden />;
}

export function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <section className="premium-panel overflow-hidden">
      <div className="border-b border-border/70 px-5 py-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-bg-panel px-4 py-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
