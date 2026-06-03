import Link from "next/link";
import { ChainAddressLink } from "@/components/explorer/address/ChainAddressLink";
import { TimeCell } from "@/components/explorer/ExplorerUi";
import { getTransactionRelatedAddresses } from "@/lib/api/indexer";
import { chainTxPath, type ChainId } from "@/lib/chainDisplay";
import { mapTransactionRelatedGroups } from "@/lib/txRelatedActivity";
import { ellipsizeMiddle } from "@/lib/utils";

export async function TxRelatedActivitySection({
  chainId,
  txid,
}: {
  chainId: ChainId;
  txid: string;
}) {
  const related = await getTransactionRelatedAddresses(chainId, txid, { limit: 6 });
  const groups = mapTransactionRelatedGroups(txid, related);

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
