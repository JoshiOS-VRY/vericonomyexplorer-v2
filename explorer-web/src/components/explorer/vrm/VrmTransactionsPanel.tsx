import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { BcHashLink, BcPanel, BcTableLink } from '@/components/explorer/BlockchairUi';
import { TxTypeBadge, formatHeight } from '@/components/explorer/ExplorerUi';
import type { IndexedTransaction } from '@/lib/api/types';
import { ellipsizeMiddle } from '@/lib/utils';

export function VrmTransactionsPanel({ transactions }: { transactions: IndexedTransaction[] }) {
  return (
    <BcPanel title="Transactions" flush>
      {transactions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">No recent transactions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Block</th>
                <th>Type</th>
                <th className="bc-col-age">Age</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.txid}>
                  <td className="max-w-[10rem] truncate sm:max-w-lg">
                    <BcHashLink href={`/vrm/tx/${tx.txid}`} value={ellipsizeMiddle(tx.txid, 32)} />
                  </td>
                  <td>
                    <BcTableLink
                      href={`/vrm/block/${tx.blockHeight}`}
                      className="tabular-nums text-sm"
                    >
                      {formatHeight(tx.blockHeight)}
                    </BcTableLink>
                  </td>
                  <td>
                    <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />
                  </td>
                  <td className="bc-col-age text-fg-muted">
                    <LiveRelativeTime time={tx.time} interval="minute" fixedWidth />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BcPanel>
  );
}
