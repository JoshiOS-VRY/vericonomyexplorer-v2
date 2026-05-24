import Link from "next/link";
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
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">{title}</h1>
          {badge}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function BcStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="bc-stat-grid mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      {children}
    </div>
  );
}

export function BcStat({
  label,
  value,
  sub,
  pulse,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="bc-stat rounded-lg border border-border bg-bg-panel p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-xl font-bold tabular-nums tracking-tight text-fg sm:text-2xl",
          pulse && "live-height-pulse",
        )}
      >
        {value}
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
    <section className={cn("bc-panel overflow-hidden rounded-lg border border-border bg-bg-panel shadow-sm", className)}>
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
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("font-medium text-accent hover:underline", className)}
    >
      {children}
    </Link>
  );
}

export function BcHashLink({ href, value }: { href: string; value: string }) {
  return (
    <Link href={href} className="bc-hash-link font-mono text-[13px] text-accent hover:underline">
      {value}
    </Link>
  );
}
