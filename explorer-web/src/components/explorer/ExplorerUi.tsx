import Link from "next/link";
import { ChainAddressLink } from "@/components/explorer/address/ChainAddressLink";
import { Badge } from "@/components/ui/Badge";
import { parseAddressFromExplorerHref } from "@/lib/explorerAddressHref";
import type { ChainId } from "@/lib/chainDisplay";
import {
  cn,
  ellipsizeMiddle,
  formatBlockAge,
  formatNumber,
  formatUnixTime,
} from "@/lib/utils";
import type { SourceInfo } from "@/lib/api/types";
import { formatExplorerSourceLabel } from "@/lib/explorerCopy";

export function SourceBadge({ source }: { source: SourceInfo }) {
  const label = formatExplorerSourceLabel(source);
  if (!label) {
    return null;
  }
  return <Badge tone="neutral">{label}</Badge>;
}

export function StatusDot({
  tone = "accent",
  pulse = false,
}: {
  tone?: "success" | "warning" | "accent" | "neutral";
  pulse?: boolean;
}) {
  const colors = {
    success: "bg-success",
    warning: "bg-warning",
    accent: "bg-accent",
    neutral: "bg-fg-subtle",
  };
  return (
    <span
      className={cn(
        "relative inline-flex h-2 w-2 shrink-0 rounded-full",
        colors[tone],
      )}
    >
      {pulse ? (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-60",
            colors[tone],
          )}
        />
      ) : null}
    </span>
  );
}

export function AlertBanner({
  title,
  children,
  tone = "warning",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "warning" | "danger" | "accent";
}) {
  const styles = {
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
    accent: "border-accent/30 bg-accent/10 text-accent",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", styles[tone])}>
      <h2 className="mb-1 font-semibold">{title}</h2>
      <div className="leading-relaxed opacity-90">{children}</div>
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: {
    label: string;
    value: React.ReactNode;
    hint?: string;
    className?: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 divide-y divide-border/70 border-t border-border/70 bg-bg-panel/30 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0 lg:divide-x">
      {items.map((item) => (
        <div key={item.label} className={cn("px-4 py-3", item.className)}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-fg">
            {item.value}
          </div>
          {item.hint ? (
            <div className="mt-0.5 text-[11px] text-fg-subtle">{item.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ChainCard({
  title,
  logo,
  badge,
  children,
  href,
  muted = false,
}: {
  title: string;
  logo: string;
  badge: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-panel p-4 shadow-sm transition hover:border-border-strong",
        muted && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            className="h-8 w-8 rounded-lg object-contain"
          />
          <div>
            <h3 className="text-sm font-semibold text-fg">{title}</h3>
            <div className="mt-1">{badge}</div>
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            className="explorer-link text-xs font-medium underline underline-offset-2"
          >
            Open
          </Link>
        ) : null}
      </div>
      <div className="mt-4 space-y-2 text-sm text-fg-muted">{children}</div>
    </div>
  );
}

export function FeatureTile({
  title,
  description,
  badge,
  href,
  hrefLabel,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-panel p-5 shadow-sm transition hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          {title}
        </h3>
        {badge}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        {hrefLabel}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm leading-relaxed text-fg-muted">
      {children}
    </div>
  );
}

export function SummaryGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-border bg-bg-subtle px-3 py-2.5"
        >
          <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-fg">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TxTypeBadge({
  isCoinbase,
  isCoinstake,
}: {
  isCoinbase?: boolean;
  isCoinstake?: boolean;
}) {
  if (isCoinbase) {
    return (
      <Badge tone="accent" className="text-[10px] uppercase tracking-wide">
        coinbase
      </Badge>
    );
  }
  if (isCoinstake) {
    return (
      <Badge tone="success" className="text-[10px] uppercase tracking-wide">
        coinstake
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className="text-[10px] uppercase tracking-wide">
      transfer
    </Badge>
  );
}

export function PaginationLinks({
  basePath,
  paging,
  extraParams = {},
  offsetParam = "offset",
  limitParam = "limit",
}: {
  basePath: string;
  paging: { limit: number; offset: number; hasMore: boolean };
  extraParams?: Record<string, string | number>;
  offsetParam?: string;
  limitParam?: string;
}) {
  const prevOffset = Math.max(0, paging.offset - paging.limit);
  const nextOffset = paging.offset + paging.limit;
  const buildHref = (offset: number) => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(extraParams).map(([k, v]) => [k, String(v)]),
      ),
    );
    params.set(limitParam, String(paging.limit));
    params.set(offsetParam, String(offset));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex justify-between">
      <div>
        {paging.offset > 0 ? (
          <Link
            href={buildHref(prevOffset)}
            className="rounded-md border border-border bg-bg-panel px-3 py-1.5 text-sm transition hover:bg-bg-subtle"
          >
            Previous
          </Link>
        ) : null}
      </div>
      <div>
        {paging.hasMore ? (
          <Link
            href={buildHref(nextOffset)}
            className="rounded-md border border-border bg-bg-panel px-3 py-1.5 text-sm transition hover:bg-bg-subtle"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  compact = false,
  rowClassName,
  stackOnMobile = true,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  compact?: boolean;
  rowClassName?: (rowIndex: number) => string | undefined;
  /**
   * On narrow viewports, render each row as a stacked label/value card instead
   * of forcing horizontal scroll. Defaults to true; set false for tables whose
   * cells already read well at small widths.
   */
  stackOnMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "data-table-scroll overflow-x-auto",
        compact ? "max-h-[360px] overflow-y-auto" : undefined,
      )}
    >
      <table className={cn("data-table", stackOnMobile && "data-table--stack")}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={rowClassName?.(index)}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} data-label={headers[cellIndex]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonoLink({
  href,
  value,
  maxLength = 24,
  prefetch,
  chainId,
}: {
  href: string;
  value: string;
  maxLength?: number;
  prefetch?: boolean;
  /** When set (or parsed from `/vrm/address/…`), pool payout uses the Verium Pool pill. */
  chainId?: ChainId;
}) {
  const parsed = chainId
    ? { chainId, address: value }
    : parseAddressFromExplorerHref(href);

  if (parsed) {
    return (
      <ChainAddressLink
        chainId={parsed.chainId}
        address={parsed.address}
        maxLength={maxLength}
        prefetch={prefetch}
        className="hash-mono underline-offset-2"
      />
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="hash-mono text-accent underline-offset-2 hover:underline"
    >
      {ellipsizeMiddle(value, maxLength)}
    </Link>
  );
}

export function TimeCell({
  time,
  absolute = false,
}: {
  time: number | null;
  absolute?: boolean;
}) {
  if (!time) return <span className="text-xs text-fg-subtle">—</span>;

  return (
    <span
      className="text-xs text-fg-muted"
      suppressHydrationWarning
      title={absolute ? formatUnixTime(time) : undefined}
    >
      {formatBlockAge(time)}
    </span>
  );
}

export function RankList({
  items,
}: {
  items: {
    href: string;
    rank: number;
    label: React.ReactNode;
    value: string;
  }[];
}) {
  if (items.length === 0) {
    return <EmptyPanel>No ranked entries yet.</EmptyPanel>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 border-t border-border px-4 py-2.5 transition first:border-t-0 hover:bg-accent/5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-fg-subtle">
            {item.rank}
          </span>
          <strong className="flex-1 truncate text-xs text-fg">
            {item.label}
          </strong>
          <em className="text-sm not-italic tabular-nums text-fg-muted">
            {item.value}
          </em>
        </Link>
      ))}
    </div>
  );
}

export function formatHeight(value: number | null | undefined) {
  return formatNumber(value);
}

export function PageHero({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  logo?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-panel px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function WalletHero({
  eyebrow,
  title,
  subtitle,
  actions,
  ribbon,
  metrics,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  ribbon?: React.ReactNode;
  metrics?: { label: string; value: React.ReactNode }[];
}) {
  return (
    <section className="wallet-panel">
      {ribbon}
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-8">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-2">{title}</div>
          {subtitle ? <div className="mt-3">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {metrics && metrics.length > 0 ? <MetricStrip items={metrics} /> : null}
    </section>
  );
}
