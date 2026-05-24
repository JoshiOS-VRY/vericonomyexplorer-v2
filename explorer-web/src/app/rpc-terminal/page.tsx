"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function RpcTerminalPage() {
  const [method, setMethod] = useState("getblockchaininfo");
  const [params, setParams] = useState("[]");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function runRpc() {
    setLoading(true);
    try {
      const response = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          params: JSON.parse(params || "[]"),
        }),
      });
      const body = await response.json();
      setResult(JSON.stringify(body, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "RPC failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">RPC Terminal</h1>
      <Card>
        <CardHeader><CardTitle>Execute RPC</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-bg-subtle px-3 font-mono text-sm"
            placeholder="method"
          />
          <textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            className="min-h-24 w-full rounded-md border border-border bg-bg-subtle px-3 py-2 font-mono text-sm"
            placeholder='["param"]'
          />
          <Button onClick={runRpc} disabled={loading}>
            {loading ? "Running..." : "Run"}
          </Button>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 font-mono text-xs">
            {result || "No result yet."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
