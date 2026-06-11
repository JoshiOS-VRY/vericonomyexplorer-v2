import { MetricStrip, formatHeight } from '@/components/explorer/ExplorerUi';
import type { BlockResult } from '@/lib/api/types';
import { formatAmountPair } from '@/lib/blockLabels';
import { formatDifficulty } from '@/lib/utils';

export function BlockMetricStrip({ result }: { result: BlockResult }) {
  const block = result.block!;
  const totals = result.totals;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <MetricStrip
        items={[
          { label: 'Transactions', value: formatHeight(block.txCount) },
          {
            label: 'Outputs',
            value: block.outputCount != null ? formatHeight(block.outputCount) : '—',
          },
          {
            label: 'Size',
            value: block.size != null ? `${formatHeight(block.size)} B` : '—',
          },
          {
            label: 'Difficulty',
            value: block.difficulty ? formatDifficulty(block.difficulty) : '—',
          },
          {
            label: 'Fees',
            value: totals?.fee ? formatAmountPair(totals.fee) : '—',
          },
        ]}
      />
    </section>
  );
}
