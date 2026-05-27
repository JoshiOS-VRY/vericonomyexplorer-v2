import Link from "next/link";
import { SourceBadge, TimeCell, formatHeight } from "@/components/explorer/ExplorerUi";
import type { TransactionResult } from "@/lib/api/types";
import { formatConfirmationLabel } from "@/lib/txLabels";
import { cn } from "@/lib/utils";

export function TxStatusBar({
  result,
  shareActions,
}: {
  result: TransactionResult;
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
          <SourceBadge source={result.source} />
          {result.trusted === false ? (
            <span className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Data may be incomplete
            </span>
          ) : null}
        </div>
        {shareActions}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 px-4 py-3 text-xs text-fg-muted sm:px-5">
        <span>
          Included in{" "}
          <Link href={`/vrm/block/${tx.blockHeight}`} className="font-semibold text-accent hover:underline">
            block {formatHeight(tx.blockHeight)}
          </Link>
        </span>
        <span>
          Position <span className="font-mono tabular-nums text-fg">{formatHeight(tx.txIndex)}</span>
        </span>
        <span>
          <TimeCell time={tx.time} absolute />
        </span>
      </div>

      {result.trusted === false && result.source.message ? (
        <div className={cn("border-t border-warning/20 bg-warning/5 px-4 py-2.5 text-xs text-warning sm:px-5")}>
          {result.source.message}
        </div>
      ) : null}
    </section>
  );
}
