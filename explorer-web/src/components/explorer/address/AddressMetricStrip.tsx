import { MetricStrip, formatHeight } from '@/components/explorer/ExplorerUi';
import type { AddressResult } from '@/lib/api/types';

export function AddressMetricStrip({ result }: { result: AddressResult }) {
  const { balance } = result;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <MetricStrip
        items={[
          {
            label: 'Balance',
            value: `${balance.balance.amount} ${balance.balance.ticker}`,
          },
          {
            label: 'Received',
            value: `${balance.totalReceived.amount} ${balance.totalReceived.ticker}`,
          },
          {
            label: 'Sent',
            value: `${balance.totalSent.amount} ${balance.totalSent.ticker}`,
          },
          {
            label: 'Transactions',
            value: formatHeight(balance.txCount),
          },
        ]}
      />
    </section>
  );
}
