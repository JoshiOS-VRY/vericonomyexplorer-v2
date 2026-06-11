import Link from 'next/link';
import {
  DataTable,
  PaginationLinks,
  TxTypeBadge,
  formatHeight,
} from '@/components/explorer/ExplorerUi';
import { DetailSection } from '@/components/explorer/BlockDetail';
import type { BlockResult, IndexedTransaction } from '@/lib/api/types';
import { chainBlockPath, chainTxPath, type ChainId } from '@/lib/chainDisplay';
import { formatAmountPair } from '@/lib/blockLabels';
import { cn, ellipsizeMiddle, formatUnixTime } from '@/lib/utils';

export function BlockTxTable({
  result,
  blockHeight,
  chainId,
}: {
  result: BlockResult;
  blockHeight: number;
  chainId: ChainId;
}) {
  const block = result.block!;

  return (
    <DetailSection
      flush
      title="Transactions"
      action={
        <span className="text-xs font-semibold tabular-nums text-fg-muted">
          {formatHeight(block.txCount)} total
        </span>
      }
    >
      {result.transactions.length === 0 ? (
        <p className="px-5 py-4 text-sm text-fg-muted">No transactions found.</p>
      ) : (
        <>
          <DataTable
            headers={['#', 'Transaction', 'Type', 'Output total', 'Outputs', 'Time']}
            rows={result.transactions.map((tx) => [
              <span key="idx" className="tabular-nums text-fg-subtle">
                {tx.txIndex ?? '—'}
              </span>,
              <TxLink key="tx" tx={tx} chainId={chainId} />,
              <TxTypeBadge key="type" isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />,
              <span key="total" className="tabular-nums">
                {tx.summary ? formatAmountPair(tx.summary.totalOutput) : '—'}
              </span>,
              <span key="outs" className="tabular-nums text-fg-muted">
                {tx.summary ? formatHeight(tx.summary.outputCount) : '—'}
              </span>,
              <span key="time" className="text-fg-muted">
                {tx.time ? formatUnixTime(tx.time) : '—'}
              </span>,
            ])}
            rowClassName={(rowIndex) =>
              cn(
                result.paging.offset === 0 &&
                  result.transactions[rowIndex]?.isCoinbase &&
                  'bg-accent/5'
              )
            }
          />
          <div className="border-t border-border px-5 py-4">
            <PaginationLinks
              basePath={chainBlockPath(chainId, blockHeight)}
              paging={result.paging}
            />
          </div>
        </>
      )}
    </DetailSection>
  );
}

function TxLink({ tx, chainId }: { tx: IndexedTransaction; chainId: ChainId }) {
  return (
    <Link href={chainTxPath(chainId, tx.txid)} className="hash-mono text-accent hover:underline">
      {ellipsizeMiddle(tx.txid, 28)}
    </Link>
  );
}
