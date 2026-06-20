import Link from 'next/link';
import { ChainAddressLink } from '@/components/explorer/address/ChainAddressLink';
import type { IndexedBlock } from '@/lib/api/types';
import { type ChainId } from '@/lib/chainDisplay';
import {
  VERIUM_POOL_PAYOUT_ADDRESS,
  isVeriumPoolExtracted,
  veriumPoolPillClassName,
} from '@/lib/veriumPoolExtracted';

export function ExtractedByCell({
  block,
  chainId,
  className,
}: {
  block: Pick<IndexedBlock, 'extractedBy' | 'extractedByAddress' | 'extractedByLink'>;
  chainId: ChainId;
  className?: string;
}) {
  const showVeriumPoolPill = chainId === 'vrm' && isVeriumPoolExtracted(block);
  const addressLinkClassName = showVeriumPoolPill
    ? veriumPoolPillClassName()
    : (className ?? 'text-sm font-medium text-accent hover:underline');

  if (block.extractedBy && block.extractedByLink) {
    return (
      <Link
        href={block.extractedByLink}
        title={block.extractedBy}
        className={
          showVeriumPoolPill
            ? veriumPoolPillClassName()
            : (className ?? 'text-sm font-medium text-accent hover:underline')
        }
        target="_blank"
        rel="noreferrer"
      >
        {block.extractedBy}
      </Link>
    );
  }

  if (block.extractedBy) {
    if (showVeriumPoolPill) {
      return (
        <ChainAddressLink
          chainId={chainId}
          address={VERIUM_POOL_PAYOUT_ADDRESS}
          maxLength={24}
          className={addressLinkClassName}
        />
      );
    }

    return (
      <span className={className ?? 'text-sm font-medium text-fg'} title={block.extractedBy}>
        {block.extractedBy}
      </span>
    );
  }

  if (block.extractedByAddress) {
    return (
      <ChainAddressLink
        chainId={chainId}
        address={block.extractedByAddress}
        maxLength={24}
        className={className}
      />
    );
  }

  return <span className={className ?? 'text-sm text-fg-muted'}>Unknown</span>;
}
