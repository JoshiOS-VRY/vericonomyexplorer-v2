"use client";

import Link from "next/link";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcPanel, BcTableLink } from "@/components/explorer/BlockchairUi";
import { TxTypeBadge, formatHeight } from "@/components/explorer/ExplorerUi";
import type { ChainSummary, IndexedTransaction } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { cn, ellipsizeMiddle } from "@/lib/utils";

interface BinaryChainActivityProps {
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
}

export function BinaryChainActivity({ vrmSummary, vrcSummary }: BinaryChainActivityProps) {
  const combined = [
    ...vrmSummary.recentTransactions.map((tx) => ({ tx, chainId: "vrm" as const })),
    ...vrcSummary.recentTransactions.map((tx) => ({ tx, chainId: "vrc" as const })),
  ]
    .sort((a, b) => (b.tx.time ?? 0) - (a.tx.time ?? 0))
    .slice(0, 12);

  return (
    <BcPanel title="Recent activity" flush>
      {combined.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">No recent transactions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Chain</th>
                <th>Transaction</th>
                <th>Block</th>
                <th>Type</th>
                <th className="bc-col-age">Age</th>
              </tr>
            </thead>
            <tbody>
              {combined.map(({ tx, chainId }) => (
                <ActivityRow key={`${chainId}-${tx.txid}`} tx={tx} chainId={chainId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BcPanel>
  );
}

function ActivityRow({
  tx,
  chainId,
}: {
  tx: IndexedTransaction;
  chainId: "vrm" | "vrc";
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const txHref = chainId === "vrm" ? `/vrm/tx/${tx.txid}` : null;
  const blockHref = config.blockHref?.(tx.blockHeight);

  return (
    <tr>
      <td>
        <span className="rounded bg-bg-subtle px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted">
          {config.ticker}
        </span>
      </td>
      <td className="max-w-[12rem] truncate font-mono text-xs">
        {txHref ? (
          <Link href={txHref} prefetch className="text-accent hover:underline">
            {ellipsizeMiddle(tx.txid, 20)}
          </Link>
        ) : (
          <span className="text-fg">{ellipsizeMiddle(tx.txid, 20)}</span>
        )}
      </td>
      <td>
        {blockHref ? (
          <BcTableLink href={blockHref} className="tabular-nums text-sm">
            {formatHeight(tx.blockHeight)}
          </BcTableLink>
        ) : (
          <span className="tabular-nums text-sm text-fg">{formatHeight(tx.blockHeight)}</span>
        )}
      </td>
      <td>
        <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />
      </td>
      <td className={cn("bc-col-age text-fg-muted")}>
        <LiveRelativeTime time={tx.time} interval="minute" fixedWidth />
      </td>
    </tr>
  );
}
