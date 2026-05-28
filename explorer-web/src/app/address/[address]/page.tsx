import {
  AlertBanner,
  DataTable,
  MonoLink,
  SummaryGrid,
} from "@/components/explorer/ExplorerUi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getLegacyAddress } from "@/lib/api/legacy";
import { formatNumber } from "@/lib/utils";

export default async function AddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  try {
    const data = (await getLegacyAddress(address)) as Record<string, unknown>;
    if (data.success === false) {
      return (
        <AlertBanner title="Address Not Found">
          No data available for this address.
        </AlertBanner>
      );
    }

    const balance = Number(data.balance ?? data.finalBalance ?? 0);
    const txids = (data.txids as string[] | undefined) ?? [];
    const txCount = Number(data.txCount ?? txids.length);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Address</h1>
        <p className="text-sm break-all text-fg-muted">{address}</p>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryGrid
              items={[
                { label: "Balance", value: balance.toLocaleString() },
                { label: "Transactions", value: formatNumber(txCount) },
                {
                  label: "Total Received",
                  value:
                    data.totalReceived != null
                      ? String(data.totalReceived)
                      : "N/A",
                },
                {
                  label: "Total Sent",
                  value:
                    data.totalSent != null ? String(data.totalSent) : "N/A",
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txids.length === 0 ? (
              <p className="text-sm text-fg-muted">No transactions found.</p>
            ) : (
              <DataTable
                headers={["#", "Txid"]}
                rows={txids
                  .slice(0, 50)
                  .map((txid, index) => [
                    String(index + 1),
                    <MonoLink
                      key={txid}
                      href={`/tx/${txid}`}
                      value={txid}
                      maxLength={48}
                    />,
                  ])}
              />
            )}
            {txids.length > 50 ? (
              <p className="mt-3 text-sm text-fg-muted">
                Showing first 50 of {txids.length} transactions.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Address Lookup Failed">
        {error instanceof Error ? error.message : "Unable to load address."}
      </AlertBanner>
    );
  }
}
