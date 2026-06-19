import Link from 'next/link';
import { BcPanel } from '@/components/explorer/BlockchairUi';
import {
  DataTable,
  MonoLink,
  PaginationLinks,
  TimeCell,
  TxTypeBadge,
  formatHeight,
} from '@/components/explorer/ExplorerUi';
import type { AddressResult } from '@/lib/api/types';
import { chainBlockPath, chainTxPath, type ChainId } from '@/lib/chainDisplay';
import { ADDRESS_UTXOS_ENABLED } from '@/lib/featureFlags';

export function AddressTransactionsTable({
  chainId,
  result,
  basePath,
  utxoLimit,
  utxoOffset,
}: {
  chainId: ChainId;
  result: AddressResult;
  basePath: string;
  utxoLimit: number;
  utxoOffset: number;
}) {
  return (
    <BcPanel
      title="Transactions"
      flush
      action={
        <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-subtle">
          {formatHeight(result.balance.txCount)} total
        </span>
      }
    >
      {result.transactions.length === 0 ? (
        <p className="px-5 py-4 text-sm text-fg-muted">No transactions found.</p>
      ) : (
        <>
          <DataTable
            headers={['Txid', 'Block', 'Net change', 'Type', 'Time']}
            rows={result.transactions.map((tx) => [
              <MonoLink
                key={`tx-${tx.txid}`}
                href={chainTxPath(chainId, tx.txid)}
                value={tx.txid}
                maxLength={36}
                prefetch
              />,
              <Link
                key={`block-${tx.txid}`}
                href={chainBlockPath(chainId, tx.blockHeight)}
                prefetch
                className="text-accent hover:underline tabular-nums"
              >
                {formatHeight(tx.blockHeight)}
              </Link>,
              <span
                key={`delta-${tx.txid}`}
                className={`font-medium tabular-nums ${
                  tx.netDeltaAtomic.startsWith('-') ? 'text-danger' : 'text-success'
                }`}
              >
                {tx.netDelta.amount} {tx.netDelta.ticker}
              </span>,
              <TxTypeBadge
                key={`type-${tx.txid}`}
                isCoinbase={tx.isCoinbase}
                isCoinstake={tx.isCoinstake}
              />,
              <TimeCell key={`time-${tx.txid}`} time={tx.time} absolute />,
            ])}
          />
          <div className="border-t border-border px-5 py-4">
            <PaginationLinks
              basePath={basePath}
              paging={result.paging}
              extraParams={
                ADDRESS_UTXOS_ENABLED
                  ? {
                      ...(utxoOffset > 0 ? { utxoOffset } : {}),
                      ...(utxoLimit !== 25 ? { utxoLimit } : {}),
                    }
                  : undefined
              }
            />
          </div>
        </>
      )}
    </BcPanel>
  );
}
