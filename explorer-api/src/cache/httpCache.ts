import type { FastifyReply, FastifyRequest } from 'fastify';

const CACHE_RULES: Array<{ pattern: RegExp; maxAge: number; swr: number }> = [
  { pattern: /^\/v1\/[^/]+\/block\//, maxAge: 60, swr: 120 },
  { pattern: /^\/v1\/[^/]+\/tx\//, maxAge: 120, swr: 300 },
  { pattern: /^\/v1\/[^/]+\/richlist/, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/[^/]+\/miners/, maxAge: 30, swr: 120 },
  { pattern: /^\/v1\/[^/]+\/leaderboard/, maxAge: 30, swr: 120 },
  { pattern: /^\/v1\/[^/]+\/peers/, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/[^/]+\/search/, maxAge: 15, swr: 30 },
  { pattern: /^\/v1\/landing/, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/vrm\/dashboard/, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/home\/shell/, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/home\/network/, maxAge: 120, swr: 300 },
  { pattern: /^\/v1\/home\/market/, maxAge: 120, swr: 300 },
  { pattern: /^\/v1\/[^/]+\/address\//, maxAge: 30, swr: 60 },
  { pattern: /^\/v1\/[^/]+\/summary/, maxAge: 15, swr: 60 },
  { pattern: /^\/v1\/[^/]+\/blocks\/latest/, maxAge: 5, swr: 30 },
  { pattern: /^\/v1\/[^/]+\/blocks$/, maxAge: 5, swr: 30 },
  { pattern: /^\/v1\/[^/]+\/insights\//, maxAge: 60, swr: 300 },
  { pattern: /^\/v1\/[^/]+\/activity-history/, maxAge: 300, swr: 600 },
];

export function applyCacheHeaders(request: FastifyRequest, reply: FastifyReply): void {
  if (request.method !== 'GET') {
    return;
  }

  const path = request.url.split('?')[0] ?? request.url;
  const rule = CACHE_RULES.find((entry) => entry.pattern.test(path));
  if (!rule) {
    return;
  }

  reply.header(
    'Cache-Control',
    `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`
  );
}
