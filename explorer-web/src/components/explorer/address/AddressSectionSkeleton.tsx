import { BcPanel } from '@/components/explorer/BlockchairUi';

export function AddressChartSkeleton() {
  return (
    <BcPanel title="Balance activity">
      <div className="h-80 animate-pulse rounded-md bg-bg-subtle sm:h-96" />
    </BcPanel>
  );
}

export function AddressUtxoPanelSkeleton() {
  return (
    <BcPanel title="Unspent outputs (UTXOs)" flush>
      <div className="space-y-3 px-5 py-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-bg-subtle" />
        ))}
      </div>
    </BcPanel>
  );
}
