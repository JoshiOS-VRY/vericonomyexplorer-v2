import Link from 'next/link';
import { TimeCell, formatHeight } from '@/components/explorer/ExplorerUi';
import type { TransactionResult } from '@/lib/api/types';
import { chainBlockPath, type ChainId } from '@/lib/chainDisplay';
import { formatConfirmationLabel } from '@/lib/txLabels';

export function TxStatusBar({
  result,
  chainId,
  shareActions,
}: {
  result: TransactionResult;
  chainId: ChainId;
  shareActions?: React.ReactNode;
}) {
  const tx = result.transaction!;
  const confirmationLabel = formatConfirmationLabel(result.confirmations);

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {confirmationLabel}
          </span>
        </div>
        {shareActions}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 px-4 py-3 text-xs text-fg-muted sm:px-5">
        <span>
          Included in{' '}
          <Link
            href={chainBlockPath(chainId, tx.blockHeight)}
            className="font-semibold text-accent hover:underline"
          >
            block {formatHeight(tx.blockHeight)}
          </Link>
        </span>
        <span>
          Position <span className="tabular-nums text-fg">{formatHeight(tx.txIndex)}</span>
        </span>
        <span>
          <TimeCell time={tx.time} absolute />
        </span>
      </div>
    </section>
  );
}
