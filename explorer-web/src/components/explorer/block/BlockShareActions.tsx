'use client';

import { CopyShareQrActions } from '@/components/explorer/CopyShareQrActions';
import { CHAIN_EXPLORERS, chainBlockPath, type ChainId } from '@/lib/chainDisplay';

export function BlockShareActions({
  chainId,
  hash,
  height,
}: {
  chainId: ChainId;
  hash: string;
  height: number;
}) {
  const chain = CHAIN_EXPLORERS[chainId];
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${chainBlockPath(chainId, height)}`
      : chainBlockPath(chainId, height);

  return (
    <CopyShareQrActions
      copyValue={hash}
      shareUrl={shareUrl}
      shareTitle={`${chain.name} block ${height}`}
      copyLabel="Copy hash"
    />
  );
}
