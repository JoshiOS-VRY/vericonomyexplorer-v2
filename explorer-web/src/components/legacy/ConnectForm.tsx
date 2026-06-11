'use client';

import { Button } from '@/components/ui/Button';

export function ConnectForm() {
  return (
    <form action="/api/connect" method="post" className="grid max-w-lg gap-4">
      <label className="grid gap-1 text-sm">
        <span className="text-fg-muted">Host</span>
        <input
          name="host"
          defaultValue="127.0.0.1"
          className="h-9 rounded-md border border-border bg-bg-subtle px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-fg-muted">Port</span>
        <input
          name="port"
          defaultValue="33987"
          className="h-9 rounded-md border border-border bg-bg-subtle px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-fg-muted">User</span>
        <input name="user" className="h-9 rounded-md border border-border bg-bg-subtle px-3" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-fg-muted">Password</span>
        <input
          name="pass"
          type="password"
          className="h-9 rounded-md border border-border bg-bg-subtle px-3"
        />
      </label>
      <Button type="submit">Connect</Button>
    </form>
  );
}
