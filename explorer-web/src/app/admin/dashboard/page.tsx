import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getIndexerHealth } from '@/lib/api/indexer';
import { getApiVersion } from '@/lib/api/legacy';
import { loadLegacy } from '@/components/legacy/LegacyViews';

export default async function AdminDashboardPage() {
  const [health, version] = await Promise.all([
    loadLegacy(getIndexerHealth),
    loadLegacy(getApiVersion),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Indexer Health</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
              {JSON.stringify(health.data ?? health.error, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API Version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{version.data ?? version.error ?? 'unknown'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
