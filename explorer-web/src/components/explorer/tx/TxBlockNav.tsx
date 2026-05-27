import Link from "next/link";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { TransactionResult } from "@/lib/api/types";
import { ellipsizeMiddle } from "@/lib/utils";

export function TxBlockNav({ result }: { result: TransactionResult }) {
  const tx = result.transaction!;
  const siblings = result.siblings ?? { prevTxid: null, nextTxid: null };

  return (
    <nav
      aria-label="Transaction navigation within block"
      className="grid gap-2 rounded-xl border border-border bg-bg-panel shadow-sm sm:grid-cols-3"
    >
      {siblings.prevTxid ? (
        <Link
          href={`/vrm/tx/${siblings.prevTxid}`}
          className="rounded-lg border border-border bg-bg-panel/60 px-4 py-3 text-sm transition hover:bg-bg-subtle m-2 sm:m-3 sm:mr-0"
        >
          <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">Previous tx</span>
          <span className="mt-1 block font-mono text-xs text-fg-muted">
            {ellipsizeMiddle(siblings.prevTxid, 18)}
          </span>
        </Link>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-fg-subtle m-2 sm:m-3 sm:mr-0">
          First in block
        </div>
      )}

      <Link
        href={`/vrm/block/${tx.blockHeight}`}
        className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-center transition hover:bg-accent/15 m-2 sm:my-3"
      >
        <span className="block text-[10px] uppercase tracking-wide text-accent">Block</span>
        <span className="mt-1 block font-mono text-lg font-semibold tabular-nums text-fg">
          #{formatHeight(tx.blockHeight)}
        </span>
        <span className="mt-0.5 block text-[11px] text-fg-muted">Tx position {formatHeight(tx.txIndex)}</span>
      </Link>

      {siblings.nextTxid ? (
        <Link
          href={`/vrm/tx/${siblings.nextTxid}`}
          className="rounded-lg border border-border bg-bg-panel/60 px-4 py-3 text-right text-sm transition hover:bg-bg-subtle m-2 sm:m-3 sm:ml-0"
        >
          <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">Next tx</span>
          <span className="mt-1 block font-mono text-xs text-fg-muted">
            {ellipsizeMiddle(siblings.nextTxid, 18)}
          </span>
        </Link>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-right text-xs text-fg-subtle m-2 sm:m-3 sm:ml-0">
          Last in block
        </div>
      )}
    </nav>
  );
}
