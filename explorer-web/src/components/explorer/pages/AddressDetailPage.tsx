import { AddressDetailLive } from '@/components/explorer/address/AddressDetailLive';
import { Breadcrumb } from '@/components/explorer/Breadcrumb';
import { RecoveryPanel } from '@/components/explorer/ExplorerUi';
import { getAddress } from '@/lib/api/indexer';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';
import { VrmAddressLabel } from '@/components/explorer/address/VrmAddressLink';
import { isVeriumPoolPayoutAddress } from '@/lib/veriumPoolExtracted';
import { ellipsizeMiddle, normalizeLimit, normalizeOffset } from '@/lib/utils';

export async function AddressDetailPage({
  chainId,
  address,
  limit,
  offset,
  utxoLimit,
  utxoOffset,
}: {
  chainId: ChainId;
  address: string;
  limit: number;
  offset: number;
  utxoLimit: number;
  utxoOffset: number;
}) {
  const chain = CHAIN_EXPLORERS[chainId];

  let result;

  try {
    result = await getAddress(chainId, address, { limit, offset, includeRank: false });
  } catch {
    return (
      <RecoveryPanel
        title="Address lookup failed"
        message="Unable to load address activity right now. Try again in a few seconds."
        chainHref={chain.exploreHref ?? undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: 'Rich list', href: chain.richlistHref! },
          {
            label:
              chainId === 'vrm' && isVeriumPoolPayoutAddress(result.address) ? (
                <VrmAddressLabel address={result.address} maxLength={16} />
              ) : (
                ellipsizeMiddle(result.address, 16)
              ),
          },
        ]}
      />
      {!result.found ? (
        <RecoveryPanel
          title="Address not found"
          message={`This address has no ${chain.ticker} balance or transaction history in the current index.`}
          chainHref={chain.richlistHref ?? undefined}
          chainLabel="Open rich list"
        />
      ) : (
        <AddressDetailLive
          chainId={chainId}
          initialResult={result}
          limit={limit}
          offset={offset}
          utxoLimit={utxoLimit}
          utxoOffset={utxoOffset}
        />
      )}
    </div>
  );
}

export function addressDetailSearchParams(searchParams: {
  limit?: string;
  offset?: string;
  utxoLimit?: string;
  utxoOffset?: string;
}) {
  return {
    limit: normalizeLimit(searchParams.limit, 25),
    offset: normalizeOffset(searchParams.offset),
    utxoLimit: normalizeLimit(searchParams.utxoLimit, 25),
    utxoOffset: normalizeOffset(searchParams.utxoOffset),
  };
}
