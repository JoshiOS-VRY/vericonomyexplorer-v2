'use client';

import dynamic from 'next/dynamic';
import { AddressChartSkeleton } from '@/components/explorer/address/AddressSectionSkeleton';

export const LazyAddressBalanceChart = dynamic(
  () => import('./AddressBalanceChart').then((module) => module.AddressBalanceChart),
  { loading: () => <AddressChartSkeleton />, ssr: false }
);
