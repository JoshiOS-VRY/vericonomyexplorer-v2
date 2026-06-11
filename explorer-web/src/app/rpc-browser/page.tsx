import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getInternalApi } from '@/lib/api/legacy';

export default async function RpcBrowserPage() {
  let methods: unknown = [];
  try {
    methods = await getInternalApi('/utils/getrpcinfo/[]');
  } catch {
    methods = [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">RPC Browser</h1>
      <Card>
        <CardHeader>
          <CardTitle>Available RPC Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
            {JSON.stringify(methods, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
