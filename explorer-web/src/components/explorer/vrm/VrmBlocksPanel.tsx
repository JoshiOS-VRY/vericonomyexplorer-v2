import Link from 'next/link';
import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { BcPanel, BcTableLink } from '@/components/explorer/BlockchairUi';
import { ExtractedByCell } from '@/components/explorer/block/ExtractedByCell';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import type { IndexedBlock } from '@/lib/api/types';
import { formatDifficulty } from '@/lib/utils';

export function VrmBlocksPanel({ blocks }: { blocks: IndexedBlock[] }) {
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
              <th>Extracted by</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.hash}>
                <td>
                  <BcTableLink href={`/vrm/block/${block.height}`} className="tabular-nums">
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
                  {block.outputCount != null ? formatHeight(block.outputCount) : '—'}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {block.size != null ? formatHeight(block.size) : '—'}
                </td>
                <td className="text-right tabular-nums text-fg-muted">
                  {block.difficulty ? formatDifficulty(block.difficulty) : '—'}
                </td>
                <td className="min-w-[8rem] max-w-[14rem]">
                  <div className="min-w-0 truncate">
                    <ExtractedByCell
                      block={block}
                      chainId="vrm"
                      className="text-sm font-medium text-accent hover:underline"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BcPanel>
  );
}

export function VrmPanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-semibold text-accent hover:underline">
      {label}
    </Link>
  );
}
