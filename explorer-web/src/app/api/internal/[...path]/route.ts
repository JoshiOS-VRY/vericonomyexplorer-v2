import { NextRequest, NextResponse } from 'next/server';
import { getApiBasePath, getApiBaseUrl } from '@/lib/api/config';

async function proxyToExpress(request: NextRequest, upstreamPath: string): Promise<NextResponse> {
  const basePath = getApiBasePath();
  const url = `${getApiBaseUrl()}${basePath}${upstreamPath}${request.nextUrl.search}`;
  const response = await fetch(url, {
    method: request.method,
    headers: {
      Accept: request.headers.get('Accept') ?? 'application/json',
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
      Cookie: request.headers.get('Cookie') ?? '',
    },
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToExpress(request, `/internal-api/${path.join('/')}`);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToExpress(request, `/internal-api/${path.join('/')}`);
}
