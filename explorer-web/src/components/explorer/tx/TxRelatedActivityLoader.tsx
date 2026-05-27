"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TimeCell } from "@/components/explorer/ExplorerUi";
import { clientApiFetch } from "@/lib/api/client";
import type { AddressResult, AddressTransaction, TransactionResult } from "@/lib/api/types";
import { uniqueRelatedAddresses } from "@/lib/txLabels";
import { ellipsizeMiddle } from "@/lib/utils";

function TxRelatedActivitySkeleton() {
  return (
    <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Related activity</h2>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-bg-subtle" />
        ))}
      </div>
    </section>
  );
}

async function loadRelatedTransactions(
  chainId: string,
  txid: string,
  addresses: string[],
): Promise<Array<{ address: string; transactions: AddressTransaction[] }>> {
  const results = await Promise.allSettled(
    addresses.map(async (address) => ({
      address,
      data: await clientApiFetch<AddressResult>(
        `/${chainId}/address/${encodeURIComponent(address)}?limit=6`,
      ),
    })),
  );

  return results.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value.data.found) {
      return [];
    }

    return [{
      address: result.value.address,
      transactions: result.value.data.transactions.filter((tx) => tx.txid !== txid).slice(0, 5),
    }];
  });
}

export function TxRelatedActivityLoader({
  chainId,
  txid,
  result,
}: {
  chainId: string;
  txid: string;
  result: TransactionResult;
}) {
  const addresses = uniqueRelatedAddresses(
    result.addressEvents,
    result.changeOutputs ?? [],
    result.outputs,
  );
  const [groups, setGroups] = useState<Array<{ address: string; transactions: AddressTransaction[] }> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const addressKey = addresses.join(",");

  useEffect(() => {
    if (addresses.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextGroups = await loadRelatedTransactions(chainId, txid, addresses);
        if (!cancelled) {
          setGroups(nextGroups);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load related activity.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressKey, chainId, txid]);

  if (addresses.length === 0) {
    return null;
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Related activity</h2>
        <p className="mt-2 text-sm text-fg-subtle">{error}</p>
      </section>
    );
  }

  if (!groups) {
    return <TxRelatedActivitySkeleton />;
  }

  const hasRows = groups.some((group) => group.transactions.length > 0);

  if (!hasRows) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Related activity</h2>
        <p className="mt-2 text-sm text-fg-subtle">No other recent transactions found for involved addresses.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Related activity</h2>
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <div key={group.address} className="px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Link href={`/vrm/address/${group.address}`} className="font-mono text-sm text-accent hover:underline">
                {ellipsizeMiddle(group.address, 32)}
              </Link>
              <span className="text-xs text-fg-subtle">Recent transactions</span>
            </div>
            {group.transactions.length === 0 ? (
              <p className="text-sm text-fg-muted">No other recent transactions.</p>
            ) : (
              <ul className="space-y-2">
                {group.transactions.map((tx) => (
                  <li key={tx.txid}>
                    <Link
                      href={`/vrm/tx/${tx.txid}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-bg-subtle/40 px-3 py-2 transition hover:bg-bg-subtle"
                    >
                      <span className="font-mono text-xs text-accent">{ellipsizeMiddle(tx.txid, 24)}</span>
                      <span className="text-xs text-fg-muted">
                        block {tx.blockHeight.toLocaleString()} · <TimeCell time={tx.time} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
