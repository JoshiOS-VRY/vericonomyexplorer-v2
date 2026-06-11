import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkBffRateLimit, getClientIpFromHeaders, type BffRateLimitTier } from '@/lib/rateLimit';

const legacyRedirects: Record<string, (pathname: string) => string | null> = {
  '/block/block/': (p) => `/block/${p.split('/block/block/')[1]}`,
  '/block/address/': (p) => `/address/${p.split('/block/address/')[1]}`,
  '/block/tx/': (p) => `/tx/${p.split('/block/tx/')[1]}`,
  '/tx/tx/': (p) => `/tx/${p.split('/tx/tx/')[1]}`,
  '/tx/block/': (p) => `/block/${p.split('/tx/block/')[1]}`,
  '/block-height/address/': (p) => `/address/${p.split('/block-height/address/')[1]}`,
  '/block-height/tx/': (p) => `/tx/${p.split('/block-height/tx/')[1]}`,
  '/block-height/block-height/': (p) =>
    `/block-height/${p.split('/block-height/block-height/')[1]}`,
};

function bffRateLimitTier(pathname: string): BffRateLimitTier | null {
  if (pathname.startsWith('/api/rpc')) return 'rpc';
  if (pathname.startsWith('/api/internal')) return 'internal';
  if (pathname.startsWith('/api/proxy')) return 'proxy';
  if (pathname === '/api/connect' || pathname === '/api/disconnect' || pathname === '/disconnect') {
    return 'auth';
  }
  return null;
}

function rateLimitedResponse(retryAfterSec?: number): NextResponse {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (retryAfterSec != null) {
    headers['Retry-After'] = String(retryAfterSec);
  }
  return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const tier = bffRateLimitTier(pathname);
  if (tier) {
    const ip = getClientIpFromHeaders(request.headers);
    const result = checkBffRateLimit(tier, ip, request.method);
    if (!result.allowed) {
      return rateLimitedResponse(result.retryAfterSec);
    }
  }

  for (const [prefix, resolver] of Object.entries(legacyRedirects)) {
    if (pathname.startsWith(prefix)) {
      const target = resolver(pathname);
      if (target) {
        return NextResponse.redirect(new URL(target, request.url), 308);
      }
    }
  }

  if (pathname.startsWith('/admin')) {
    const adminToken = process.env.EXPLORER_ADMIN_TOKEN;
    if (adminToken) {
      const cookie = request.cookies.get('explorer_admin')?.value;
      if (cookie !== adminToken) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
