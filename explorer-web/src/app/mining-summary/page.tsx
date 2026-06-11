import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner, SummaryGrid } from '@/components/explorer/ExplorerUi';
import { getInternalApi, getNextBlock } from '@/lib/api/legacy';

export default async function MiningSummaryPage() {
  try {
    const [summary, nextBlock] = await Promise.all([
      getInternalApi<Record<string, unknown>>('/get-mining-summary'),
      getNextBlock(),
    ]);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mining Summary</h1>
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryGrid
              items={Object.entries(summary)
                .slice(0, 8)
                .map(([key, value]) => ({
                  label: key,
                  value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next Block Template</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
              {JSON.stringify(nextBlock, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <AlertBanner title="Mining Summary Unavailable">
        {error instanceof Error ? error.message : 'Unable to load mining summary.'}
      </AlertBanner>
    );
  }
}
