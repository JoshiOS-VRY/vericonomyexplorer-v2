import Link from 'next/link';
import { BcPanel } from '@/components/explorer/BlockchairUi';
import {
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
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Txid</th>
                  <th>Block</th>
                  <th className="text-right">Net change</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((tx) => (
                  <tr key={tx.txid}>
                    <td>
                      <MonoLink
                        href={chainTxPath(chainId, tx.txid)}
                        value={tx.txid}
                        maxLength={36}
                        prefetch
                      />
                    </td>
                    <td>
                      <Link
                        href={chainBlockPath(chainId, tx.blockHeight)}
                        prefetch
                        className="text-accent hover:underline tabular-nums"
                      >
                        {formatHeight(tx.blockHeight)}
                      </Link>
                    </td>
                    <td
                      className={`text-right font-medium tabular-nums ${
                        tx.netDeltaAtomic.startsWith('-') ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {tx.netDelta.amount} {tx.netDelta.ticker}
                    </td>
                    <td>
                      <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />
                    </td>
                    <td>
                      <TimeCell time={tx.time} absolute />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
