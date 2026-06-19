import { AnimatedStatValue } from '@/components/explorer/AnimatedStatValue';
import { cn } from '@/lib/utils';

export function ChainHubSectionHead({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="chain-hub-section-head">
      <h4 className="chain-hub-section-head__title">{title}</h4>
      {meta != null ? <span className="chain-hub-section-head__meta">{meta}</span> : null}
    </div>
  );
}

export function ChainHubStatRow({
  cols = 3,
  children,
  className,
}: {
  cols?: 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'chain-hub-stat-row grid divide-x divide-border',
        cols === 4 ? 'grid-cols-4' : 'grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ChainHubStatCell({
  label,
  value,
  mono = false,
  className,
  valueClassName,
  animated = false,
  numericValue,
  formatFn,
  pulse,
  title,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
  valueClassName?: string;
  animated?: boolean;
  numericValue?: number;
  formatFn?: (value: number) => string;
  pulse?: boolean;
  title?: string;
}) {
  const renderedValue =
    animated && typeof value === 'string' ? (
      <AnimatedStatValue
        value={value}
        numericValue={numericValue}
        formatFn={formatFn}
        pulse={pulse}
        className={valueClassName}
      />
    ) : (
      <span className={cn(pulse && 'live-height-pulse', valueClassName)}>{value}</span>
    );

  return (
    <div className={cn('chain-hub-stat-cell flex min-w-0 flex-col justify-center', className)}>
      <div className="chain-hub-stat-cell__label truncate">{label}</div>
      <div
        className={cn(
          'chain-hub-stat-cell__value truncate text-fg',
          mono && 'font-mono text-[13px] sm:text-sm'
        )}
        title={title}
      >
        {renderedValue}
      </div>
    </div>
  );
}
