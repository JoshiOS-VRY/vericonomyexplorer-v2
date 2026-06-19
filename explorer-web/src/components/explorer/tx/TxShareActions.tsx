'use client';

import { CopyShareQrActions } from '@/components/explorer/CopyShareQrActions';
import { CHAIN_EXPLORERS, chainTxPath, type ChainId } from '@/lib/chainDisplay';

export function TxShareActions({ chainId, txid }: { chainId: ChainId; txid: string }) {
  const chain = CHAIN_EXPLORERS[chainId];
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${chainTxPath(chainId, txid)}`
      : chainTxPath(chainId, txid);

  return (
    <CopyShareQrActions
      copyValue={txid}
      shareUrl={shareUrl}
      shareTitle={`${chain.name} transaction`}
      copyLabel="Copy txid"
    />
  );
}
