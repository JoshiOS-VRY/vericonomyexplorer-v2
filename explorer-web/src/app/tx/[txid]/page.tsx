import { AlertBanner, MonoLink, SummaryGrid, TimeCell } from "@/components/explorer/ExplorerUi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTx } from "@/lib/api/legacy";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

export default async function TxPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  try {
    const data = (await getTx(txid)) as Record<string, unknown>;
    if (data.success === false) {
      return <AlertBanner title="Transaction Not Found">No transaction matched this txid.</AlertBanner>;
    }

    const vin = (data.vin as Array<Record<string, unknown>> | undefined) ?? [];
    const vout = (data.vout as Array<Record<string, unknown>> | undefined) ?? [];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Transaction</h1>
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent>
            <SummaryGrid
              items={[
                { label: "Txid", value: <MonoLink href={`/tx/${txid}`} value={txid} maxLength={36} /> },
                { label: "Block", value: data.blockhash ? <Link href={`/block/${String(data.blockhash)}`} className="text-accent hover:underline">View block</Link> : "Unconfirmed" },
                { label: "Confirmations", value: formatNumber(Number(data.confirmations ?? 0)) },
                { label: "Size", value: data.size ? formatNumber(Number(data.size)) : "N/A" },
                { label: "Time", value: data.time ? <TimeCell time={Number(data.time)} /> : "Unconfirmed" },
              ]}
            />
          </CardContent>
        </Card>
        <section className="grid gap-6 lg:grid-cols-2">
          <IoTable title="Inputs" rows={vin.map((input, index) => [
            String(index),
            input.coinbase ? "coinbase" : input.txid ? <MonoLink href={`/tx/${String(input.txid)}`} value={String(input.txid)} maxLength={20} /> : "—",
            input.value != null ? String(input.value) : "—",
          ])} />
          <IoTable title="Outputs" rows={vout.map((output, index) => [
            String(index),
            output.scriptPubKey && typeof output.scriptPubKey === "object"
              ? String((output.scriptPubKey as { addresses?: string[] }).addresses?.[0] ?? "script")
              : "—",
            output.value != null ? String(output.value) : "—",
          ])} />
        </section>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Transaction Lookup Failed">
        {error instanceof Error ? error.message : "Unable to load transaction."}
      </AlertBanner>
    );
  }
}

function IoTable({ title, rows }: { title: string; rows: React.ReactNode[][] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-fg-muted">None</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border first:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
