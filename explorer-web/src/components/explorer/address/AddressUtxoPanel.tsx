import Link from "next/link";
import { BcHashLink, BcPanel } from "@/components/explorer/BlockchairUi";
import { formatHeight, PaginationLinks } from "@/components/explorer/ExplorerUi";
import type { AddressUtxosResult } from "@/lib/api/types";

export function AddressUtxoPanel({
  utxos,
  basePath,
}: {
  utxos: AddressUtxosResult;
  basePath: string;
}) {
  if (utxos.summary.utxoCount === 0) {
    return null;
  }

  return (
    <BcPanel
      title="Unspent outputs (UTXOs)"
      flush
      action={
        <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-subtle">
          {formatHeight(utxos.summary.utxoCount)} · {utxos.summary.totalValue.amount} {utxos.summary.totalValue.ticker}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="bc-table">
          <thead>
            <tr>
              <th>Outpoint</th>
              <th className="text-right">Amount</th>
              <th>Block</th>
            </tr>
          </thead>
          <tbody>
            {utxos.items.map((item) => (
              <tr key={`${item.txid}:${item.vout}`}>
                <td>
                  <BcHashLink
                    href={`/vrm/tx/${item.txid}`}
                    value={`${item.txid.slice(0, 12)}…:${item.vout}`}
                  />
                </td>
                <td className="text-right font-medium tabular-nums">
                  {item.value.amount} {item.value.ticker}
                </td>
                <td>
                  <Link href={`/vrm/block/${item.blockHeight}`} className="text-accent hover:underline tabular-nums">
                    {formatHeight(item.blockHeight)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {utxos.paging.hasMore || utxos.paging.offset > 0 ? (
        <div className="border-t border-border px-5 py-4">
          <PaginationLinks
            basePath={basePath}
            paging={utxos.paging}
            offsetParam="utxoOffset"
            limitParam="utxoLimit"
          />
        </div>
      ) : null}
    </BcPanel>
  );
}
