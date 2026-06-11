import { TimeCell } from '@/components/explorer/ExplorerUi';
import type { BlockResult } from '@/lib/api/types';
import { formatBlockConfirmationLabel, formatAmountPair, isTipBlock } from '@/lib/blockLabels';

export function BlockStatusBar({ result }: { result: BlockResult }) {
  const block = result.block!;
  const confirmationLabel = formatBlockConfirmationLabel(result.confirmations);
  const blockTime = result.transactions.find((tx) => tx.time)?.time ?? block.time ?? null;

  return (
    <section className="rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <span className="inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {confirmationLabel}
        </span>
        {isTipBlock(block.nextHash) ? (
          <span className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            Latest block
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 px-4 py-3 text-xs text-fg-muted sm:px-5">
        {blockTime ? (
          <span>
            Mined <TimeCell time={blockTime} absolute />
          </span>
        ) : null}
        {result.totals ? (
          <span>Total output {formatAmountPair(result.totals.outputValue)}</span>
        ) : null}
      </div>
    </section>
  );
}
