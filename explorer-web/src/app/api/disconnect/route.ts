import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";

export async function GET(request: Request) {
  await fetch(`${getApiBaseUrl()}/disconnect`, { cache: "no-store" });
  return NextResponse.redirect(new URL("/", request.url));
}
