import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner, DataTable } from '@/components/explorer/ExplorerUi';
import { getInternalApi } from '@/lib/api/legacy';

export default async function MempoolTransactionsPage() {
  try {
    const data = await getInternalApi<{ transactions?: Array<Record<string, unknown>> }>(
      '/get-mempool-summary'
    );
    const txs = data.transactions ?? [];
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mempool Transactions</h1>
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txs.length === 0 ? (
              <p className="text-sm text-fg-muted">No mempool transactions available.</p>
            ) : (
              <DataTable
                headers={['Txid', 'Size', 'Fee']}
                rows={txs
                  .slice(0, 100)
                  .map((tx) => [
                    String(tx.txid ?? tx.hash ?? '—'),
                    String(tx.size ?? '—'),
                    String(tx.fee ?? '—'),
                  ])}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Mempool Transactions Unavailable">
        {error instanceof Error ? error.message : 'Unable to load mempool transactions.'}
      </AlertBanner>
    );
  }
}
