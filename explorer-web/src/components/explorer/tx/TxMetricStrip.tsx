import { MetricStrip, TxTypeBadge } from '@/components/explorer/ExplorerUi';
import type { TransactionResult } from '@/lib/api/types';
import { formatAmountPair } from '@/lib/txLabels';

export function TxMetricStrip({ result }: { result: TransactionResult }) {
  const tx = result.transaction!;
  const totals = result.totals;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <MetricStrip
        items={[
          {
            label: 'Total in',
            value: totals ? formatAmountPair(totals.input) : 'N/A',
          },
          {
            label: 'Total out',
            value: totals ? formatAmountPair(totals.output) : 'N/A',
          },
          {
            label: 'Fee',
            value: totals ? formatAmountPair(totals.fee) : 'N/A',
          },
          {
            label: 'Type',
            value: <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />,
          },
        ]}
      />
    </section>
  );
}
