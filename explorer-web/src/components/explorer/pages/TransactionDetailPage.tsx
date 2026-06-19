import { RecoveryPanel } from '@/components/explorer/ExplorerUi';
import { Breadcrumb } from '@/components/explorer/Breadcrumb';
import { TransactionDetailLive } from '@/components/explorer/tx/TransactionDetailLive';
import { getChainSummary, getTransaction } from '@/lib/api/indexer';
import { CHAIN_EXPLORERS, chainBlockPath, type ChainId } from '@/lib/chainDisplay';
import { ellipsizeMiddle } from '@/lib/utils';

export async function TransactionDetailPage({ chainId, txid }: { chainId: ChainId; txid: string }) {
  const chain = CHAIN_EXPLORERS[chainId];

  let result;
  try {
    result = await getTransaction(chainId, txid);
  } catch {
    return (
      <RecoveryPanel
        title="Transaction lookup failed"
        message="Unable to load transaction data right now. Retry search or open the latest blocks."
        chainHref={chain.exploreHref ?? undefined}
      />
    );
  }

  if (!result.found || !result.transaction) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[{ label: chain.name, href: chain.exploreHref! }, { label: 'Transaction' }]}
        />
        <RecoveryPanel
          title="Transaction not found"
          message="This transaction is not available in the current index."
          chainHref={chain.exploreHref ?? undefined}
        />
      </div>
    );
  }

  const tx = result.transaction;

  let summary;
  try {
    summary = await getChainSummary(chainId);
  } catch {
    summary = null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: 'Block', href: chainBlockPath(chainId, tx.blockHeight) },
          { label: ellipsizeMiddle(tx.txid, 16) },
        ]}
      />

      <TransactionDetailLive
        chainId={chainId}
        txid={tx.txid}
        initialResult={result}
        initialSummary={summary}
      />
    </div>
  );
}
