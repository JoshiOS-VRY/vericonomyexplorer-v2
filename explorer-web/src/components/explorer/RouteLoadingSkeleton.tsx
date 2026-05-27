function PulseBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-subtle ${className ?? ""}`} />;
}

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <PulseBlock className="h-5 w-40" />
      </div>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: rows }).map((_, index) => (
          <PulseBlock key={index} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-bg-panel px-4 py-4">
          <PulseBlock className="h-3 w-16" />
          <PulseBlock className="mt-2 h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

export function HomeLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <PulseBlock className="h-32 w-full rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <PanelSkeleton rows={0} />
        <PanelSkeleton rows={0} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <PulseBlock className="h-4 w-32" />
            </div>
            <StatGridSkeleton />
          </section>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}

export function VrmLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PulseBlock className="h-28 w-full rounded-xl" />
      <StatGridSkeleton />
      <div className="grid gap-4 xl:grid-cols-2">
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={3} />
      </div>
      <PulseBlock className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <PanelSkeleton />
        <div className="space-y-6">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

export function AddressLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PulseBlock className="h-24 w-full rounded-xl" />
      <StatGridSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PanelSkeleton rows={1} />
        </div>
        <PanelSkeleton rows={4} />
      </div>
      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={6} />
    </div>
  );
}

export function BlockLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PulseBlock className="h-6 w-48" />
      <PulseBlock className="h-32 w-full rounded-xl" />
      <StatGridSkeleton />
      <PanelSkeleton rows={8} />
    </div>
  );
}

export function TxLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PulseBlock className="h-6 w-56" />
      <PulseBlock className="h-24 w-full rounded-xl" />
      <PulseBlock className="h-40 w-full rounded-xl" />
      <StatGridSkeleton />
      <PanelSkeleton rows={4} />
    </div>
  );
}

export function RichlistLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <PulseBlock className="h-8 w-32" />
        <PulseBlock className="mt-2 h-4 w-64" />
      </div>
      <PanelSkeleton rows={10} />
    </div>
  );
}
