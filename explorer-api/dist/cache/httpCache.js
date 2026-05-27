const CACHE_RULES = [
    { pattern: /^\/v1\/[^/]+\/block\//, maxAge: 60, swr: 120 },
    { pattern: /^\/v1\/[^/]+\/tx\//, maxAge: 120, swr: 300 },
    { pattern: /^\/v1\/[^/]+\/richlist/, maxAge: 30, swr: 60 },
    { pattern: /^\/v1\/home\/shell/, maxAge: 30, swr: 60 },
    { pattern: /^\/v1\/home\/network/, maxAge: 120, swr: 300 },
    { pattern: /^\/v1\/home\/market/, maxAge: 120, swr: 300 },
    { pattern: /^\/v1\/[^/]+\/address\//, maxAge: 30, swr: 60 },
    { pattern: /^\/v1\/[^/]+\/summary/, maxAge: 5, swr: 15 },
];
export function applyCacheHeaders(request, reply) {
    if (request.method !== "GET") {
        return;
    }
    const path = request.url.split("?")[0] ?? request.url;
    const rule = CACHE_RULES.find((entry) => entry.pattern.test(path));
    if (!rule) {
        return;
    }
    reply.header("Cache-Control", `public, max-age=${rule.maxAge}, stale-while-revalidate=${rule.swr}`);
}
