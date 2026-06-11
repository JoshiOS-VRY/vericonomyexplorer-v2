'use client';

import { LazyAddressBalanceChart } from '@/components/explorer/address/LazyAddressBalanceChart';

export function AddressBalanceChartClient({
  chainId,
  address,
}: {
  chainId: string;
  address: string;
}) {
  return <LazyAddressBalanceChart chainId={chainId} address={address} />;
}
