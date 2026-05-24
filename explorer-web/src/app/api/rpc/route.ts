import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { method?: string; params?: unknown[] };
  const method = body.method ?? "getblockchaininfo";
  const params = body.params ?? [];

  const response = await fetch(`${getApiBaseUrl()}/rpc-terminal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: method, params }),
    cache: "no-store",
  });

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json({ raw: text }, { status: response.status });
  }
}
