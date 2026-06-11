import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api/config';

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${getApiBaseUrl()}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body as Record<string, string>),
    redirect: 'manual',
  });

  const next = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) next.headers.set('set-cookie', setCookie);
  return next;
}
