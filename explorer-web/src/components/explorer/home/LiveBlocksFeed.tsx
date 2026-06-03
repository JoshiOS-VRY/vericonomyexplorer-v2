"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcPanel, BcTableLink } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import { useLatestBlocksPoll } from "@/hooks/useLatestBlocksPoll";
import type { IndexedBlock } from "@/lib/api/types";
import { LATEST_BLOCKS_COUNT } from "@/lib/chainBlocksDisplay";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { cn } from "@/lib/utils";

interface LiveBlocksFeedProps {
  chainId: "vrm" | "vrc";
  seedBlocks: IndexedBlock[];
}

export function LiveBlocksFeed({ chainId, seedBlocks }: LiveBlocksFeedProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const { blocks, isRefreshing } = useLatestBlocksPoll(chainId, seedBlocks);
  const rows = blocks.slice(0, LATEST_BLOCKS_COUNT);
  const action =
    config.exploreHref != null ? (
      <Link
        href={config.exploreHref}
        className="text-xs font-semibold text-accent hover:underline"
      >
        View all
      </Link>
    ) : null;

  return (
    <BcPanel
      title={`Latest ${config.ticker} blocks`}
      flush
      action={
        <>
          <span className="mr-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-success">
            <Radio
              className={cn("h-2.5 w-2.5", isRefreshing && "animate-pulse")}
              aria-hidden
            />
            Live
          </span>
          {action}
        </>
      }
    >
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
                    className="live-block-row transition-colors hover:bg-bg-subtle/80"
                  >
                    <td>
                      {blockHref ? (
                        <BcTableLink
                          href={blockHref}
                          className="tabular-nums"
                          prefetch
                        >
                          {formatHeight(block.height)}
                        </BcTableLink>
                      ) : (
                        <span className="tabular-nums text-fg">
                          {formatHeight(block.height)}
                        </span>
                      )}
                    </td>
                    <td className="bc-col-age text-fg-muted">
                      <LiveRelativeTime
                        time={block.time}
                        interval="second"
                        fixedWidth
                      />
                    </td>
                    <td className="text-right tabular-nums text-fg-muted">
                      {formatHeight(block.txCount)}
                    </td>
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
