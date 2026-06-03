"use client";

import Link from "next/link";
import { ChainAddressLink } from "@/components/explorer/address/ChainAddressLink";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TimeCell } from "@/components/explorer/ExplorerUi";
import { clientApiFetch } from "@/lib/api/client";
import type { TransactionRelatedAddressesResult } from "@/lib/api/types";
import { chainTxPath, type ChainId } from "@/lib/chainDisplay";
import {
  mapTransactionRelatedGroups,
  type TxRelatedActivityGroup,
} from "@/lib/txRelatedActivity";
import { ellipsizeMiddle } from "@/lib/utils";

export function TxRelatedActivityClient({
  chainId,
  txid,
}: {
  chainId: ChainId;
  txid: string;
}) {
  const [groups, setGroups] = useState<TxRelatedActivityGroup[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const related = await clientApiFetch<TransactionRelatedAddressesResult>(
          `/${chainId}/tx/${encodeURIComponent(txid)}/related-addresses?limit=6`,
        );

        if (cancelled) {
          return;
        }

        setGroups(mapTransactionRelatedGroups(txid, related));
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chainId, txid]);

  if (failed) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Related activity
        </h2>
        <p className="mt-2 text-sm text-fg-subtle">
          Unable to load related activity right now.
        </p>
      </section>
    );
  }

  if (groups === null) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading related activity…
        </div>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Related activity
        </h2>
        <p className="mt-2 text-sm text-fg-subtle">
          No other recent transactions found for involved addresses.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Related activity
        </h2>
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <div key={group.address} className="px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <ChainAddressLink
                chainId={chainId}
                address={group.address}
                maxLength={32}
                prefetch
                className="text-sm"
              />
              <span className="text-xs text-fg-subtle">
                Recent transactions
              </span>
            </div>
            <ul className="space-y-2">
              {group.transactions.map((tx) => (
                <li key={tx.txid}>
                  <Link
                    href={chainTxPath(chainId, tx.txid)}
                    prefetch
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-bg-subtle/40 px-3 py-2 transition hover:bg-bg-subtle"
                  >
                    <span className="text-xs text-accent">
                      {ellipsizeMiddle(tx.txid, 24)}
                    </span>
                    <span className="text-xs text-fg-muted">
                      block {tx.blockHeight.toLocaleString()} ·{" "}
                      <TimeCell time={tx.time} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
