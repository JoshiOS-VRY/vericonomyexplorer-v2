'use client';

import type { InsightsChartView } from '@/lib/insightsChartConfig';
import { cn } from '@/lib/utils';

export function ChartViewToggle<T extends string>({
  views,
  view,
  onViewChange,
  loading,
}: {
  views: { id: T; label: string }[];
  view: T;
  onViewChange: (next: T) => void;
  loading?: boolean;
}) {
  return (
    <div className="chart-control-group inline-flex rounded-lg border border-border/80 bg-bg-subtle/80 p-0.5 backdrop-blur-sm">
      {views.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={loading}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-200',
              active
                ? 'bg-bg-panel text-fg shadow-sm ring-1 ring-border/60'
                : 'text-fg-muted hover:text-fg',
              loading && !active && 'opacity-60'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChartViewToggleInsights({
  view,
  onViewChange,
  loading,
  allowedViews,
}: {
  view: InsightsChartView;
  onViewChange: (next: InsightsChartView) => void;
  loading?: boolean;
  allowedViews?: InsightsChartView[];
}) {
  const views = [
    { id: 'line' as const, label: 'Line' },
    { id: 'area' as const, label: 'Area' },
    { id: 'bar' as const, label: 'Bar' },
  ].filter((item) => !allowedViews || allowedViews.includes(item.id));

  return (
    <ChartViewToggle views={views} view={view} onViewChange={onViewChange} loading={loading} />
  );
}
