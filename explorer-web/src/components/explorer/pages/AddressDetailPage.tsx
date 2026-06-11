import { AddressDetailLive } from '@/components/explorer/address/AddressDetailLive';
import { BcPageHeader } from '@/components/explorer/BlockchairUi';
import { Breadcrumb } from '@/components/explorer/Breadcrumb';
import { AlertBanner } from '@/components/explorer/ExplorerUi';
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
    return <AlertBanner title="Address Lookup Failed">Unable to load address data.</AlertBanner>;
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

      <BcPageHeader
        title="Address"
        subtitle={
          result.found ? `${chain.name} address activity and holdings.` : 'Address not found.'
        }
      />

      {!result.found ? (
        <>
          <AlertBanner title="Address Not Found">
            This address has no {chain.ticker} balance or transaction history.
          </AlertBanner>
        </>
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
