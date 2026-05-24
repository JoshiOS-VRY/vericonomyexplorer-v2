import Link from "next/link";
import {
  AlertBanner,
  DataTable,
  MonoLink,
  SummaryGrid,
  TimeCell,
  TxTypeBadge,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { DetailSection, EntityHero } from "@/components/explorer/BlockDetail";
import { Breadcrumb } from "@/components/explorer/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTransaction } from "@/lib/api/indexer";
import { ellipsizeMiddle } from "@/lib/utils";

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  let result;
  try {
    result = await getTransaction("vrm", txid);
  } catch {
    return <AlertBanner title="Transaction Lookup Failed">Unable to load transaction data.</AlertBanner>;
  }

  if (!result.found || !result.transaction) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: "Verium", href: "/vrm" }, { label: "Transaction" }]} />
        <AlertBanner title="Transaction Not Found">
          This transaction was not found in the explorer.
        </AlertBanner>
      </div>
    );
  }

  const tx = result.transaction;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: "Verium", href: "/vrm" },
          { label: "Block", href: `/vrm/block/${tx.blockHeight}` },
          { label: ellipsizeMiddle(tx.txid, 16) },
        ]}
      />

      <EntityHero
        eyebrow="Verium transaction"
        title={ellipsizeMiddle(tx.txid, 24)}
        hash={tx.txid}
        meta={
          <span className="text-xs text-fg-muted">
            Block {formatHeight(tx.blockHeight)} · <TimeCell time={tx.time} absolute />
          </span>
        }
      />

      <DetailSection title="Summary">
        <SummaryGrid
          items={[
            {
              label: "Block",
              value: <Link href={`/vrm/block/${tx.blockHeight}`} className="text-accent hover:underline">{formatHeight(tx.blockHeight)}</Link>,
            },
            { label: "Index", value: formatHeight(tx.txIndex) },
            { label: "Type", value: <TxTypeBadge isCoinbase={tx.isCoinbase} isCoinstake={tx.isCoinstake} /> },
            { label: "Time", value: <TimeCell time={tx.time} absolute /> },
          ]}
        />
      </DetailSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <IoTable
          title="Inputs"
          rows={result.inputs.map((input) => [
            String(input.n),
            input.address ? (
              <MonoLink key="a" href={`/vrm/address/${input.address}`} value={input.address} maxLength={20} />
            ) : (
              <span className="text-fg-muted">coinbase</span>
            ),
            input.value ? `${input.value.amount} ${input.value.ticker}` : "N/A",
          ])}
          headers={["#", "Address", "Value"]}
          empty="No indexed inputs."
        />
        <IoTable
          title="Outputs"
          rows={result.outputs.map((output) => [
            String(output.n),
            output.address ? (
              <MonoLink key="a" href={`/vrm/address/${output.address}`} value={output.address} maxLength={20} />
            ) : (
              <span className="text-fg-muted">{output.scriptType || "unknown"}</span>
            ),
            `${output.value.amount} ${output.value.ticker}`,
            output.isSpent ? (
              <Link key="s" href={`/vrm/tx/${output.spentByTxid}`} className="text-accent hover:underline">
                yes
              </Link>
            ) : (
              <span className="text-success">no</span>
            ),
          ])}
          headers={["#", "Address", "Value", "Spent"]}
          empty="No indexed outputs."
        />
      </section>

      <DetailSection flush title="Address Deltas">
        {result.addressEvents.length === 0 ? (
          <p className="px-5 py-4 text-sm text-fg-muted">No address deltas recorded.</p>
        ) : (
          <DataTable
            headers={["Address", "Event", "Delta"]}
            rows={result.addressEvents.map((event) => [
              <Link key="a" href={`/vrm/address/${event.address}`} className="hash-mono text-accent hover:underline">
                {ellipsizeMiddle(event.address, 24)}
              </Link>,
              event.eventType,
              <span key="d" className={event.deltaAtomic.startsWith("-") ? "text-danger" : "text-success"}>
                {event.delta.amount} {event.delta.ticker}
              </span>,
            ])}
          />
        )}
      </DetailSection>
    </div>
  );
}

function IoTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className={rows.length > 0 ? "p-0" : undefined}>
        {rows.length === 0 ? (
          <p className="text-sm text-fg-muted">{empty}</p>
        ) : (
          <DataTable headers={headers} rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}
