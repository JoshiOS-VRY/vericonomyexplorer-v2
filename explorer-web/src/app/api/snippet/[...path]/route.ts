import { NextRequest, NextResponse } from "next/server";
import { getApiBasePath, getApiBaseUrl } from "@/lib/api/config";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const basePath = getApiBasePath();
  const url = `${getApiBaseUrl()}${basePath}/snippet/${path.join("/")}${request.nextUrl.search}`;
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/html",
    },
  });
}
