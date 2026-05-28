import Link from "next/link";
import { AddressBalanceChartClient } from "@/components/explorer/address/AddressBalanceChartClient";
import { AddressHero } from "@/components/explorer/address/AddressHero";
import { AddressMetricStrip } from "@/components/explorer/address/AddressMetricStrip";
import { AddressRichlistRankClient } from "@/components/explorer/address/AddressRichlistRankClient";
import { AddressUtxoPanelClient } from "@/components/explorer/address/AddressUtxoPanelClient";
import { BcPageHeader, BcPanel } from "@/components/explorer/BlockchairUi";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import {
  AlertBanner,
  MonoLink,
  PaginationLinks,
  TimeCell,
  TxTypeBadge,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { getAddress } from "@/lib/api/indexer";
import {
  CHAIN_EXPLORERS,
  chainAddressPath,
  chainBlockPath,
  chainTxPath,
  type ChainId,
} from "@/lib/chainDisplay";
import { ADDRESS_UTXOS_ENABLED } from "@/lib/featureFlags";
import { ellipsizeMiddle, normalizeLimit, normalizeOffset } from "@/lib/utils";

export async function AddressDetailPage({
  chainId,
  address,
  limit,
  offset,
  utxoLimit,
  utxoOffset,
}: {
  chainId: ChainId;
  address: string;
  limit: number;
  offset: number;
  utxoLimit: number;
  utxoOffset: number;
}) {
  const chain = CHAIN_EXPLORERS[chainId];

  let result;

  try {
    result = await getAddress(chainId, address, { limit, offset, includeRank: false });
  } catch {
    return <AlertBanner title="Address Lookup Failed">Unable to load address data.</AlertBanner>;
  }

  const basePath = chainAddressPath(chainId, result.address);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: chain.name, href: chain.exploreHref! },
          { label: "Rich list", href: chain.richlistHref! },
          { label: ellipsizeMiddle(result.address, 16) },
        ]}
      />

      <BcPageHeader
        title="Address"
        subtitle={
          result.found
            ? `${chain.name} address activity and holdings.`
            : "Address not found."
        }
      />

      <AddressHero result={result} />

      {!result.found ? (
        <AlertBanner title="Address Not Found">
          This address has no {chain.ticker} balance or transaction history.
        </AlertBanner>
      ) : (
        <>
          <AddressMetricStrip result={result} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AddressBalanceChartClient chainId={chainId} address={result.address} />
            </div>
            <div>
              <AddressRichlistRankClient chainId={chainId} address={result.address} />
            </div>
          </div>

          {ADDRESS_UTXOS_ENABLED ? (
            <AddressUtxoPanelClient
              chainId={chainId}
              address={result.address}
              basePath={basePath}
              utxoLimit={utxoLimit}
              utxoOffset={utxoOffset}
            />
          ) : null}

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
                              tx.netDeltaAtomic.startsWith("-") ? "text-danger" : "text-success"
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
        </>
      )}
    </div>
  );
}

export function addressDetailSearchParams(searchParams: {
  limit?: string;
  offset?: string;
  utxoLimit?: string;
  utxoOffset?: string;
}) {
  return {
    limit: normalizeLimit(searchParams.limit, 25),
    offset: normalizeOffset(searchParams.offset),
    utxoLimit: normalizeLimit(searchParams.utxoLimit, 25),
    utxoOffset: normalizeOffset(searchParams.utxoOffset),
  };
}
