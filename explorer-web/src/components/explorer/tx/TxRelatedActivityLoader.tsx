'use client';

import { TxRelatedActivityClient } from '@/components/explorer/tx/TxRelatedActivityClient';
import type { ChainId } from '@/lib/chainDisplay';

export function TxRelatedActivityLoader({ chainId, txid }: { chainId: string; txid: string }) {
  return <TxRelatedActivityClient chainId={chainId as ChainId} txid={txid} />;
}
