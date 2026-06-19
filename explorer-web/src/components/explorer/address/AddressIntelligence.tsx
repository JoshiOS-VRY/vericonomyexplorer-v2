'use client';

import Link from 'next/link';
import { ArrowLeftRight, Clock, Hash, Wallet } from 'lucide-react';
import type { AddressResult } from '@/lib/api/types';
import { CHAIN_EXPLORERS, chainBlockPath, type ChainId } from '@/lib/chainDisplay';
import { formatHeight, TimeCell } from '@/components/explorer/ExplorerUi';
import { cn } from '@/lib/utils';

export function AddressIntelligence({
  chainId,
  result,
}: {
  chainId: ChainId;
  result: AddressResult;
}) {
  const chain = CHAIN_EXPLORERS[chainId];
  const { balance } = result;

  if (!result.found) {
    return (
      <section className="premium-panel px-5 py-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
          Address intelligence
        </h2>
        <p className="mt-2 text-sm text-fg-muted">No on-chain activity found for this address.</p>
      </section>
    );
  }

  const items = [
    {
      icon: Wallet,
      label: 'Balance',
      value: `${balance.balance.amount} ${balance.balance.ticker}`,
      highlight: true,
    },
    {
      icon: ArrowLeftRight,
      label: 'Transactions',
      value: balance.txCount.toLocaleString(),
    },
    {
      icon: Hash,
      label: 'Total received',
      value: balance.totalReceived?.amount ?? '—',
    },
    {
      icon: Hash,
      label: 'Total sent',
      value: balance.totalSent?.amount ?? '—',
    },
    {
      icon: Clock,
      label: 'First seen',
      value:
        balance.firstSeenHeight != null ? (
          <Link
            href={chainBlockPath(chainId, balance.firstSeenHeight)}
            className="text-accent hover:underline"
          >
            Block {formatHeight(balance.firstSeenHeight)}
            {balance.firstSeenTime != null ? (
              <>
                {' '}
                · <TimeCell time={balance.firstSeenTime} absolute />
              </>
            ) : null}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      icon: Clock,
      label: 'Last active',
      value:
        balance.lastSeenHeight != null ? (
          <Link
            href={chainBlockPath(chainId, balance.lastSeenHeight)}
            className="text-accent hover:underline"
          >
            Block {formatHeight(balance.lastSeenHeight)}
          </Link>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <section className="premium-panel overflow-hidden">
      <div className="border-b border-border/70 px-5 py-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
          {chain.ticker} address intelligence
        </h2>
      </div>
      <ul className="divide-y divide-border/50">
        {items.map(({ icon: Icon, label, value, highlight }) => (
          <li key={label} className="flex items-start gap-3 px-5 py-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                {label}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm tabular-nums',
                  highlight ? 'text-lg font-bold text-fg' : 'font-medium text-fg-muted'
                )}
              >
                {value}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
