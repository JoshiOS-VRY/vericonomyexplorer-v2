import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcPanel, BcTableLink } from "@/components/explorer/BlockchairUi";
import { ExtractedByCell } from "@/components/explorer/block/ExtractedByCell";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { IndexedBlock } from "@/lib/api/types";
import type { ChainId } from "@/lib/chainDisplay";
import { formatPercent } from "@/lib/formatMarket";
import { formatDifficulty } from "@/lib/utils";

export function ChainBlocksPanel({
  chainId,
  blocks,
}: {
  chainId: ChainId;
  blocks: IndexedBlock[];
}) {
  const producerLabel = chainId === "vrm" ? "Extracted by" : "Interest";

  if (blocks.length === 0) {
    return (
      <BcPanel title="Blocks" flush>
        <p className="px-4 py-6 text-sm text-fg-muted">No blocks indexed yet.</p>
      </BcPanel>
    );
  }

  return (
    <BcPanel title="Blocks" flush>
      <div className="overflow-x-auto">
        <table className="bc-table">
          <thead>
            <tr>
              <th>Height</th>
              <th className="bc-col-age">Time</th>
              <th className="text-right">Txs</th>
              <th className="text-right">Out</th>
              <th className="text-right">Size</th>
              <th className="text-right">Difficulty</th>
              <th>{producerLabel}</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.hash}>
                <td>
                  <BcTableLink
                    href={`/${chainId}/block/${block.height}`}
                    className="tabular-nums"
                  >
                    {formatHeight(block.height)}
                  </BcTableLink>
                </td>
                <td className="bc-col-age text-fg-muted">
                  <LiveRelativeTime time={block.time} interval="second" fixedWidth />
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {formatHeight(block.txCount)}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {block.outputCount != null ? formatHeight(block.outputCount) : "—"}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {block.size != null ? formatHeight(block.size) : "—"}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {block.difficulty ? formatDifficulty(block.difficulty) : "—"}
                </td>
                <td className="min-w-[8rem] max-w-[14rem] truncate">
                  {chainId === "vrm" ? (
                    <ExtractedByCell
                      block={block}
                      chainId={chainId}
                      className="block truncate text-sm font-medium text-accent hover:underline"
                    />
                  ) : (
                    <span className="text-sm tabular-nums text-fg-muted">
                      {formatPercent(block.interestRatePercent)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BcPanel>
  );
}
