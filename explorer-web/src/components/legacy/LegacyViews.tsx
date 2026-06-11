import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertBanner } from '@/components/explorer/ExplorerUi';

export function LegacyJsonView({
  title,
  subtitle,
  data,
  error,
}: {
  title: string;
  subtitle?: string;
  data?: unknown;
  error?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {error ? <AlertBanner title="Data Unavailable">{error}</AlertBanner> : null}
      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
            {JSON.stringify(data ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export function StaticInfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="prose prose-invert max-w-none py-6 text-sm text-fg-muted">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

async function loadLegacy<T>(loader: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await loader() };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

export { loadLegacy };
