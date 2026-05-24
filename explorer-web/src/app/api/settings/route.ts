import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PREFS_COOKIE = "explorer_prefs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const value = url.searchParams.get("value");
  if (!key) {
    return NextResponse.json({ success: false, error: "Missing key" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(PREFS_COOKIE)?.value;
  const prefs = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  if (value != null) prefs[key] = value;

  const response = NextResponse.redirect(new URL("/user-settings", request.url));
  response.cookies.set(PREFS_COOKIE, JSON.stringify(prefs), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
