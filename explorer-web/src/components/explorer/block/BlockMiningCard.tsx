import Link from "next/link";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import type { BlockResult } from "@/lib/api/types";
import { chainTxPath, type ChainId } from "@/lib/chainDisplay";
import { formatAmountPair } from "@/lib/blockLabels";

export function BlockMiningCard({
  result,
  chainId,
}: {
  result: BlockResult;
  chainId: ChainId;
}) {
  const block = result.block!;
  const coinbase = result.coinbase;

  if (!coinbase && !block.extractedBy && !block.extractedByAddress) {
    return null;
  }

  return (
    <section className="rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
      <div className="border-b border-accent/20 px-5 py-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Mining
        </h2>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        {coinbase ? (
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Coinbase tx
            </div>
            <Link
              href={chainTxPath(chainId, coinbase.txid)}
              className="mt-1 block text-xs text-accent hover:underline"
            >
              {coinbase.txid.slice(0, 16)}…{coinbase.txid.slice(-8)}
            </Link>
          </div>
        ) : null}
        {coinbase ? (
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              Block reward
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-fg">
              {formatAmountPair(coinbase.reward)}
            </div>
          </div>
        ) : null}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
            Extracted by
          </div>
          <div className="mt-1">
            <ExtractedByCell block={block} chainId={chainId} />
          </div>
        </div>
      </div>
    </section>
  );
}
