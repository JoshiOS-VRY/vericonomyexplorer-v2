import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatBlockAge, formatNumber } from '@/lib/utils';

export function PaginationBar({
  basePath,
  limit,
  offset,
  total,
  sort,
  extraParams = {},
}: {
  basePath: string;
  limit: number;
  offset: number;
  total: number;
  sort?: string;
  extraParams?: Record<string, string | number>;
}) {
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  const buildHref = (next: number) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(next),
      ...Object.fromEntries(
        Object.entries({ ...extraParams, ...(sort ? { sort } : {}) }).map(([k, v]) => [
          k,
          String(v),
        ])
      ),
    });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div>
        {offset > 0 ? (
          <Link href={buildHref(prevOffset)}>
            <Button variant="secondary" size="sm">
              Previous
            </Button>
          </Link>
        ) : null}
      </div>
      <span className="text-sm text-fg-muted">
        Showing {formatNumber(offset + 1)}–{formatNumber(Math.min(offset + limit, total))} of{' '}
        {formatNumber(total)}
      </span>
      <div>
        {offset + limit < total ? (
          <Link href={buildHref(nextOffset)}>
            <Button variant="secondary" size="sm">
              Next
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function SummaryRow({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-fg-muted">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BlockAge({ time }: { time?: number | null }) {
  return <span className="text-fg-muted">{formatBlockAge(time ?? null)}</span>;
}

export interface RpcBlockRow {
  height: number;
  hash?: string;
  time?: number;
  nTx?: number;
  txCount?: number;
  size?: number;
  miner?: { name?: string; type?: string };
}

export function BlocksTable({ blocks }: { blocks: RpcBlockRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-bg-panel text-left text-xs uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-4 py-3">Height</th>
            <th className="px-4 py-3">Age</th>
            <th className="px-4 py-3">Tx</th>
            <th className="px-4 py-3">Size (kB)</th>
            <th className="px-4 py-3">Miner</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.height} className="border-t border-border odd:bg-bg-subtle/30">
              <td className="px-4 py-3">
                <Link href={`/block/${block.height}`} className="text-accent hover:underline">
                  {formatNumber(block.height)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <BlockAge time={block.time} />
              </td>
              <td className="px-4 py-3">{formatNumber(block.nTx ?? block.txCount ?? 0)}</td>
              <td className="px-4 py-3">
                {block.size ? formatNumber(Math.round(block.size / 1000)) : '—'}
              </td>
              <td className="px-4 py-3 text-fg-muted">{block.miner?.name ?? 'Unknown'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
