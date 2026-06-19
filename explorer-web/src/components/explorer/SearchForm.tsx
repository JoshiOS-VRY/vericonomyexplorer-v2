'use client';

import {
  ExplorerSearchCombobox,
  type RecentBlocksByChain,
} from '@/components/explorer/ExplorerSearchCombobox';

export function SearchForm({
  variant = 'default',
  recentBlocks,
  inputId,
}: {
  variant?: 'default' | 'blockchair';
  recentBlocks?: RecentBlocksByChain;
  inputId?: string;
}) {
  return <ExplorerSearchCombobox variant={variant} recentBlocks={recentBlocks} inputId={inputId} />;
}
