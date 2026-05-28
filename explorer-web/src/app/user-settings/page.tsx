import Link from "next/link";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api/config";

export default async function UserSettingsPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("explorer_prefs")?.value;
  const prefs = raw ? JSON.parse(raw) : {};

  let expressSession: unknown = null;
  try {
    expressSession = await apiFetch("/session-data");
  } catch {
    expressSession = null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">User Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Next Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
            {JSON.stringify(prefs, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Express Session</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-xs">
            {JSON.stringify(expressSession, null, 2)}
          </pre>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/api/settings?key=displayCurrency&value=vrm"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-bg-subtle"
        >
          Display VRM
        </Link>
        <Link
          href="/connect"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-bg-subtle"
        >
          Connect Node
        </Link>
        <Link
          href="/disconnect"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-bg-subtle"
        >
          Disconnect
        </Link>
      </div>
    </div>
  );
}
