import { clientApiFetch } from '@/lib/api/client';
import type { AddressResult } from '@/lib/api/types';

export async function fetchAddressClient(
  chainId: string,
  address: string,
  params: { limit?: number; offset?: number; includeRank?: boolean } = {}
): Promise<AddressResult> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  if (params.includeRank) search.set('includeRank', '1');
  const qs = search.toString();

  return clientApiFetch<AddressResult>(
    `/${chainId}/address/${encodeURIComponent(address)}${qs ? `?${qs}` : ''}`
  );
}

/** True when balance, counts, and the visible tx head are unchanged. */
export function isSameAddressLiveSnapshot(previous: AddressResult, next: AddressResult): boolean {
  const prevBalance = previous.balance;
  const nextBalance = next.balance;

  if (
    prevBalance.balanceAtomic !== nextBalance.balanceAtomic ||
    prevBalance.txCount !== nextBalance.txCount ||
    prevBalance.lastSeenHeight !== nextBalance.lastSeenHeight ||
    prevBalance.totalReceived.amount !== nextBalance.totalReceived.amount ||
    prevBalance.totalSent.amount !== nextBalance.totalSent.amount
  ) {
    return false;
  }

  if (previous.transactions.length !== next.transactions.length) {
    return false;
  }

  const prevHead = previous.transactions[0];
  const nextHead = next.transactions[0];
  if (!prevHead && !nextHead) {
    return true;
  }
  if (!prevHead || !nextHead) {
    return false;
  }

  return (
    prevHead.txid === nextHead.txid &&
    prevHead.blockHeight === nextHead.blockHeight &&
    prevHead.netDeltaAtomic === nextHead.netDeltaAtomic
  );
}
