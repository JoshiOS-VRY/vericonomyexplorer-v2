import Link from "next/link";
import { AnimatedStatValue } from "@/components/explorer/AnimatedStatValue";
import { cn } from "@/lib/utils";
export function BcPageHeader({
  title,
  subtitle,
  badge,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function BcStatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bc-stat-grid grid grid-cols-2 gap-3 px-3 py-2 sm:grid-cols-3 lg:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BcStat({
  label,
  value,
  sub,
  pulse,
  animated = false,
  numericValue,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  pulse?: boolean;
  animated?: boolean;
  numericValue?: number;
}) {
  const renderedValue =
    animated && typeof value === "string" ? (
      <AnimatedStatValue
        value={value}
        numericValue={numericValue}
        pulse={pulse}
        className={cn(pulse && !animated && "live-height-pulse")}
      />
    ) : (
      <span className={cn(pulse && "live-height-pulse")}>{value}</span>
    );

  return (
    <div className="bc-stat rounded-lg border border-border bg-bg-panel p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-lg font-bold tabular-nums tracking-tight text-fg sm:text-xl",
        )}
      >
        {renderedValue}
      </div>
      {sub ? <div className="mt-1 text-xs text-fg-muted">{sub}</div> : null}
    </div>
  );
}
export function BcPanel({
  title,
  action,
  children,
  className,
  flush,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "bc-panel overflow-hidden rounded-lg border border-border bg-bg-panel shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-base font-bold text-fg">{title}</h2>
        {action}
      </div>
      <div className={flush ? undefined : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export function BcTableLink({
  href,
  children,
  className,
  title,
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title}
      prefetch={prefetch}
      className={cn("font-medium text-accent hover:underline", className)}
    >
      {children}
    </Link>
  );
}

export function BcHashLink({
  href,
  value,
  prefetch,
}: {
  href: string;
  value: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="bc-hash-link font-mono text-[13px] text-accent hover:underline"
    >
      {value}
    </Link>
  );
}
