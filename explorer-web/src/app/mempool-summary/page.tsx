import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner } from '@/components/explorer/ExplorerUi';
import { SummaryRow } from '@/components/legacy/LegacyShared';
import { getInternalApi } from '@/lib/api/legacy';

export default async function MempoolSummaryPage() {
  try {
    const data = await getInternalApi<Record<string, unknown>>('/get-mempool-summary');
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mempool Summary</h1>
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryRow
              items={[
                { label: 'Count', value: String(data.count ?? data.txCount ?? 'N/A') },
                { label: 'Total Fees', value: String(data.totalFees ?? 'N/A') },
                { label: 'Total Size', value: String(data.totalSize ?? 'N/A') },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Mempool Summary Unavailable">
        {error instanceof Error ? error.message : 'Unable to load mempool summary.'}
      </AlertBanner>
    );
  }
}
