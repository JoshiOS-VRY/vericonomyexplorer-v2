'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BcHashLink, BcPanel } from '@/components/explorer/BlockchairUi';
import { PaginationLinks, formatHeight } from '@/components/explorer/ExplorerUi';
import { useLivePoll } from '@/hooks/useLivePoll';
import { fetchRichlistClient } from '@/lib/api/client';
import type { RichlistResult } from '@/lib/api/types';
import type { ChainId } from '@/lib/chainDisplay';
import { ENTITY_LIVE_POLL_MS } from '@/lib/liveDataConfig';
import { formatCoinAmount } from '@/lib/utils';

function richlistSignature(data: RichlistResult): string {
  return data.items
    .map((item) => `${item.rank}:${item.address}:${item.balance.amount}:${item.txCount}`)
    .join('|');
}

export function RichlistLiveTable({
  chainId,
  initialRichlist,
  basePath,
  limit,
  offset,
}: {
  chainId: ChainId;
  initialRichlist: RichlistResult;
  basePath: string;
  limit: number;
  offset: number;
}) {
  const [richlist, setRichlist] = useState(initialRichlist);
  const signatureRef = useRef(richlistSignature(initialRichlist));
  const inFlightRef = useRef(false);

  useEffect(() => {
    signatureRef.current = richlistSignature(initialRichlist);
    setRichlist(initialRichlist);
  }, [initialRichlist]);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const next = await fetchRichlistClient(chainId, { limit, offset });
      const nextSignature = richlistSignature(next);
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setRichlist(next);
      }
    } catch {
      /* keep last snapshot */
    } finally {
      inFlightRef.current = false;
    }
  }, [chainId, limit, offset]);

  useLivePoll({
    chainId,
    enabled: richlist.enabled !== false,
    intervalMs: ENTITY_LIVE_POLL_MS,
    onRefresh: refresh,
  });

  const paging = richlist.paging ?? {
    limit,
    offset,
    total: richlist.items.length,
    hasMore: false,
  };
  const addressPathPrefix = `${basePath.replace(/\/richlist$/, '')}/address`;

  return (
    <BcPanel title="Addresses" flush>
      <div className="overflow-x-auto">
        <table className="bc-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th className="text-right">Balance</th>
              <th className="text-right">Received</th>
              <th className="text-right">Sent</th>
              <th className="text-right">Tx</th>
            </tr>
          </thead>
          <tbody>
            {richlist.items.map((item) => (
              <tr key={item.address}>
                <td className="tabular-nums text-fg-subtle">{item.rank}</td>
                <td>
                  <BcHashLink
                    href={`${addressPathPrefix}/${item.address}`}
                    value={item.address}
                    prefetch
                  />
                </td>
                <td className="text-right font-medium tabular-nums">
                  {formatCoinAmount(item.balance.amount)} {item.balance.ticker}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {formatCoinAmount(item.totalReceived.amount)}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {formatCoinAmount(item.totalSent.amount)}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {formatHeight(item.txCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-5 py-4">
        <PaginationLinks basePath={basePath} paging={paging} />
      </div>
    </BcPanel>
  );
}
