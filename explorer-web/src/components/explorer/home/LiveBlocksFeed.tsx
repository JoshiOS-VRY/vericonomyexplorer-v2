"use client";

import Link from "next/link";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcPanel, BcTableLink } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { IndexedBlock } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { cn } from "@/lib/utils";

interface LiveBlocksFeedProps {
  chainId: "vrm" | "vrc";
  blocks: IndexedBlock[];
  newBlockHashes: Set<string>;
}

export function LiveBlocksFeed({ chainId, blocks, newBlockHashes }: LiveBlocksFeedProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const rows = blocks.slice(0, 8);
  const action =
    config.exploreHref != null ? (
      <Link href={config.exploreHref} className="text-xs font-semibold text-accent hover:underline">
        View all
      </Link>
    ) : null;

  return (
    <BcPanel title={`Latest ${config.ticker} blocks`} flush action={action}>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">No blocks yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Height</th>
                <th className="bc-col-age">Time</th>
                <th className="text-right">Txs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((block) => {
                const blockHref = config.blockHref?.(block.height);
                return (
                  <tr
                    key={block.hash}
                    className={cn(
                      "live-block-row transition-colors hover:bg-bg-subtle/80",
                      newBlockHashes.has(block.hash) && "live-block-new",
                    )}
                  >
                    <td>
                      {blockHref ? (
                        <BcTableLink href={blockHref} className="tabular-nums" prefetch>
                          {formatHeight(block.height)}
                        </BcTableLink>
                      ) : (
                        <span className="tabular-nums text-fg">{formatHeight(block.height)}</span>
                      )}
                    </td>
                    <td className="bc-col-age text-fg-muted">
                      <LiveRelativeTime time={block.time} interval="second" fixedWidth />
                    </td>
                    <td className="text-right tabular-nums text-fg-muted">{formatHeight(block.txCount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </BcPanel>
  );
}

export function NewBlockToast({ block, chainId }: { block: IndexedBlock; chainId: "vrm" | "vrc" }) {
  const ticker = CHAIN_EXPLORERS[chainId].ticker;
  return (
    <div className="live-toast pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-accent/25 bg-bg-panel px-4 py-3 shadow-lg">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          New {ticker} block
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-fg">#{formatHeight(block.height)}</p>
      </div>
    </div>
  );
}
