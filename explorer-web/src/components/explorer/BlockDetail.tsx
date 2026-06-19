import Link from 'next/link';
import { cn, formatBlockAge, formatDifficulty, formatUnixTime } from '@/lib/utils';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  return (
    <button type="button" data-copy-value={value} data-copy-label={label} className="action-btn">
      {label}
    </button>
  );
}

export function BlockChainNav({
  height,
  previousHash,
  nextHash,
  chainPrefix = '/vrm/block',
}: {
  height: number;
  previousHash?: string | null;
  nextHash?: string | null;
  chainPrefix?: string;
}) {
  const prevHeight = height > 0 ? height - 1 : null;

  return (
    <nav
      aria-label="Block navigation"
      className="grid gap-2 border-t border-border/70 px-4 py-3 sm:grid-cols-3 sm:px-5"
    >
      {previousHash ? (
        <Link
          href={`${chainPrefix}/${previousHash}`}
          className="rounded-md border border-border bg-bg-panel/60 px-3 py-2 text-sm transition hover:bg-bg-panel"
        >
          <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">Previous</span>
          <span className="text-xs text-fg-muted">#{prevHeight?.toLocaleString() ?? '…'}</span>
        </Link>
      ) : (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-fg-subtle">
          Genesis
        </div>
      )}

      <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-center">
        <span className="block text-[10px] uppercase tracking-wide text-accent">Current</span>
        <span className="text-lg font-semibold tabular-nums text-fg">
          #{height.toLocaleString()}
        </span>
      </div>

      {nextHash ? (
        <Link
          href={`${chainPrefix}/${nextHash}`}
          className="rounded-md border border-border bg-bg-panel/60 px-3 py-2 text-right text-sm transition hover:bg-bg-panel"
        >
          <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">Next</span>
          <span className="text-xs text-fg-muted">#{(height + 1).toLocaleString()}</span>
        </Link>
      ) : (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-right text-xs text-fg-subtle">
          Latest block
        </div>
      )}
    </nav>
  );
}

export function BlockDetailHero({
  height,
  hash,
  blockTime,
  txCount,
  size,
  difficulty,
  previousHash,
  nextHash,
  actions,
}: {
  height: number;
  hash: string;
  blockTime: number | null;
  txCount: number;
  size: number | null;
  difficulty?: number | string | null;
  previousHash?: string | null;
  nextHash?: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <section className="premium-panel entity-hero-premium">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {blockTime ? (
            <span className="text-xs text-fg-muted" suppressHydrationWarning>
              {formatUnixTime(blockTime)} · {formatBlockAge(blockTime)}
            </span>
          ) : null}
        </div>
        {actions}
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            Block height
          </p>
          <p className="entity-hero-premium__height mt-2">{height.toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-md border border-border/70 bg-bg-panel/50 px-2.5 py-1 text-xs text-fg-muted">
              {hash}
            </code>
            <CopyButton value={hash} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[16rem]">
          {[
            { label: 'Transactions', value: txCount.toLocaleString() },
            {
              label: 'Size',
              value: size == null ? '—' : `${size.toLocaleString()} B`,
            },
            { label: 'Difficulty', value: formatDifficulty(difficulty) },
          ].map((stat) => (
            <div key={stat.label} className="entity-hero-stat">
              <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                {stat.label}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-fg">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <BlockChainNav height={height} previousHash={previousHash} nextHash={nextHash} />
    </section>
  );
}

export function DetailSection({
  title,
  action,
  children,
  className,
  flush = false,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn('premium-panel overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{title}</h2>
        {action}
      </div>
      <div className={cn(flush ? 'p-0' : 'px-5 py-4')}>{children}</div>
    </section>
  );
}

export function EntityHero({
  eyebrow,
  title,
  hash,
  meta,
  badges,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  hash?: string;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="premium-panel entity-hero-premium">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2.5 sm:px-5">
        {badges}
        {meta}
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{eyebrow}</p>
        <h1 className="entity-hero-premium__title mt-2">{title}</h1>
        {hash ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-md border border-border/70 bg-bg-panel/50 px-2.5 py-1 text-xs text-fg-muted">
              {hash}
            </code>
            <CopyButton value={hash} />
          </div>
        ) : null}
      </div>
      {footer}
    </section>
  );
}
