import Link from "next/link";
import {
  AlertBanner,
  DataTable,
  MonoLink,
  PaginationLinks,
  SummaryGrid,
  TimeCell,
  TxTypeBadge,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { DetailSection, EntityHero } from "@/components/explorer/BlockDetail";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import { getAddress } from "@/lib/api/indexer";
import { ellipsizeMiddle, normalizeLimit, normalizeOffset } from "@/lib/utils";

export default async function AddressPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const { address } = await params;
  const query = await searchParams;
  const limit = normalizeLimit(query.limit, 25);
  const offset = normalizeOffset(query.offset);

  let result;
  try {
    result = await getAddress("vrm", address, { limit, offset });
  } catch {
    return <AlertBanner title="Address Lookup Failed">Unable to load address data.</AlertBanner>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: "Verium", href: "/vrm" },
          { label: "Address", href: "/vrm/richlist" },
          { label: ellipsizeMiddle(result.address, 16) },
        ]}
      />

      <EntityHero
        eyebrow="Verium address"
        title={ellipsizeMiddle(result.address, 28)}
        hash={result.address}
        meta={
          result.found ? (
            <span className="text-sm font-semibold tabular-nums text-fg">
              {result.balance.balance.amount} {result.balance.balance.ticker}
            </span>
          ) : undefined
        }
      />

      {!result.found ? (
        <AlertBanner title="Address Not Found">
          This address has no VRM balance or transaction history.
        </AlertBanner>
      ) : (
        <>
          <DetailSection title="Balance">
            <SummaryGrid
              items={[
                { label: "Balance", value: `${result.balance.balance.amount} ${result.balance.balance.ticker}` },
                { label: "Received", value: `${result.balance.totalReceived.amount} ${result.balance.totalReceived.ticker}` },
                { label: "Sent", value: `${result.balance.totalSent.amount} ${result.balance.totalSent.ticker}` },
                { label: "Transactions", value: formatHeight(result.balance.txCount) },
              ]}
            />
          </DetailSection>

          <DetailSection
            flush
            title="Transactions"
            action={
              <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-subtle">
                {formatHeight(result.balance.txCount)} total
              </span>
            }
          >
            {result.transactions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-fg-muted">No indexed transactions found.</p>
            ) : (
              <>
                <DataTable
                  headers={["Txid", "Block", "Net Change", "Type", "Time"]}
                  rows={result.transactions.map((tx) => [
                    <MonoLink key="tx" href={`/vrm/tx/${tx.txid}`} value={tx.txid} maxLength={36} />,
                    <Link key="b" href={`/vrm/block/${tx.blockHeight}`} className="text-accent hover:underline">
                      {formatHeight(tx.blockHeight)}
                    </Link>,
                    <span key="n" className={tx.netDeltaAtomic.startsWith("-") ? "text-danger" : "text-success"}>
                      {tx.netDelta.amount} {tx.netDelta.ticker}
                    </span>,
                    <TxTypeBadge key="type" isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} />,
                    <TimeCell key="t" time={tx.time} absolute />,
                  ])}
                />
                <div className="px-5 pb-4">
                  <PaginationLinks
                    basePath={`/vrm/address/${result.address}`}
                    paging={result.paging}
                  />
                </div>
              </>
            )}
          </DetailSection>
        </>
      )}
    </div>
  );
}
