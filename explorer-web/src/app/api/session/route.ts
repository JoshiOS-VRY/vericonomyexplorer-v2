import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/config";

const PREFS_COOKIE = "explorer_prefs";
const CSRF_COOKIE = "explorer_csrf";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PREFS_COOKIE)?.value;
  let prefs = {};
  if (raw) {
    try {
      prefs = JSON.parse(raw);
    } catch {
      prefs = {};
    }
  }

  let expressSession: unknown = null;
  try {
    expressSession = await apiFetch("/session-data");
  } catch {
    expressSession = null;
  }

  return NextResponse.json({
    prefs,
    message: cookieStore.get("explorer_message")?.value ?? null,
    csrfToken: cookieStore.get(CSRF_COOKIE)?.value ?? null,
    expressSession,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const response = NextResponse.json({ success: true, prefs: body });
  response.cookies.set(PREFS_COOKIE, JSON.stringify(body), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
