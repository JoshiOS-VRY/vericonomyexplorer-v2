'use client';

import Link from 'next/link';
import type { BlockResult } from '@/lib/api/types';
import { chainBlockPath, chainTxPath, type ChainId } from '@/lib/chainDisplay';
import { formatAmountPair } from '@/lib/blockLabels';
import { ellipsizeMiddle } from '@/lib/utils';

export function BlockAdvancedPanel({ result, chainId }: { result: BlockResult; chainId: ChainId }) {
  const block = result.block!;

  return (
    <details className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium uppercase tracking-wide text-fg-muted">
        Advanced details
      </summary>
      <div className="space-y-4 border-t border-border px-5 py-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Block hash
            </dt>
            <dd className="mt-1 break-all text-xs text-fg-muted">{block.hash}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Previous hash
            </dt>
            <dd className="mt-1">
              {block.previousHash ? (
                <Link
                  href={chainBlockPath(chainId, block.previousHash)}
                  className="break-all text-xs text-accent hover:underline"
                >
                  {block.previousHash}
                </Link>
              ) : (
                <span className="text-fg-muted">Genesis</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">Size</dt>
            <dd className="mt-1 tabular-nums text-fg">
              {block.size != null ? `${block.size.toLocaleString()} B` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Difficulty
            </dt>
            <dd className="mt-1 text-xs text-fg">{block.difficulty ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Output count
            </dt>
            <dd className="mt-1 tabular-nums text-fg">
              {block.outputCount != null ? block.outputCount.toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Data source
            </dt>
            <dd className="mt-1 text-fg">{result.source.label}</dd>
          </div>
          {result.totals ? (
            <>
              {result.totals.fee ? (
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                    Total fees
                  </dt>
                  <dd className="mt-1 tabular-nums text-fg">
                    {formatAmountPair(result.totals.fee)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                  Total output value
                </dt>
                <dd className="mt-1 tabular-nums text-fg">
                  {formatAmountPair(result.totals.outputValue)}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        {result.transactions.length > 0 ? (
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Transactions on this page
            </h3>
            <ul className="mt-2 space-y-1">
              {result.transactions.map((tx) => (
                <li key={tx.txid}>
                  <Link
                    href={chainTxPath(chainId, tx.txid)}
                    className="text-xs text-accent hover:underline"
                  >
                    {ellipsizeMiddle(tx.txid, 32)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
