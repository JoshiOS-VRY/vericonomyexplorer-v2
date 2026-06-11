import type { Metadata } from 'next';
import {
  AddressDetailPage,
  addressDetailSearchParams,
} from '@/components/explorer/pages/AddressDetailPage';
import { addressPageMetadata } from '@/lib/seo/dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  return addressPageMetadata('vrc', address);
}

export default async function VrcAddressPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{
    limit?: string;
    offset?: string;
    utxoLimit?: string;
    utxoOffset?: string;
  }>;
}) {
  const { address } = await params;
  const { limit, offset, utxoLimit, utxoOffset } = addressDetailSearchParams(await searchParams);

  return (
    <AddressDetailPage
      chainId="vrc"
      address={address}
      limit={limit}
      offset={offset}
      utxoLimit={utxoLimit}
      utxoOffset={utxoOffset}
    />
  );
}
