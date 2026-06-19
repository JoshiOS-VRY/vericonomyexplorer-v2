'use client';

import { CopyShareQrActions } from '@/components/explorer/CopyShareQrActions';
import { CHAIN_EXPLORERS, chainAddressPath, type ChainId } from '@/lib/chainDisplay';

export function AddressShareActions({ chainId, address }: { chainId: ChainId; address: string }) {
  const chain = CHAIN_EXPLORERS[chainId];
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${chainAddressPath(chainId, address)}`
      : chainAddressPath(chainId, address);

  return (
    <CopyShareQrActions
      copyValue={address}
      shareUrl={shareUrl}
      shareTitle={`${chain.name} address`}
      copyLabel="Copy address"
    />
  );
}
