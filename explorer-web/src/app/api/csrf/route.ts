import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

const CSRF_COOKIE = 'explorer_csrf';

export async function GET() {
  const token = randomBytes(24).toString('hex');
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  const cookieStore = await cookies();
  const expected = cookieStore.get(CSRF_COOKIE)?.value;
  if (!expected || body.token !== expected) {
    return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
