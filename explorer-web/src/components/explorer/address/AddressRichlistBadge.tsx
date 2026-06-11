import Link from 'next/link';
import type { AddressRichlistInfo } from '@/lib/api/types';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';

export function AddressRichlistBadge({
  chainId,
  richlist,
}: {
  chainId: ChainId;
  richlist: AddressRichlistInfo;
  address: string;
}) {
  if (!richlist.enabled || !richlist.eligible || richlist.rank == null) {
    return null;
  }

  const richlistHref = CHAIN_EXPLORERS[chainId].richlistHref;
  if (!richlistHref) {
    return null;
  }

  const offset = Math.max(richlist.rank - 1, 0);
  const topPercent =
    richlist.percentile != null ? Math.max(1, Math.ceil(richlist.percentile * 100)) : null;

  return (
    <Link
      href={`${richlistHref}?offset=${offset}&limit=50`}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition hover:border-accent/50 hover:bg-accent/15"
      title="View on rich list"
    >
      <span>#{formatHeight(richlist.rank)}</span>
      <span className="font-normal text-accent/80">
        of {formatHeight(richlist.total)}
        {topPercent != null ? ` · top ${topPercent}%` : ''}
      </span>
    </Link>
  );
}
