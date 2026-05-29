import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(moduleDir, "..", "..");
let loaded = false;
export function loadEnv() {
    if (loaded)
        return;
    loaded = true;
    loadDotenv({ path: path.join(repoRoot, ".env") });
    loadDotenv({ path: path.join(repoRoot, ".env.local"), override: true });
    process.chdir(repoRoot);
}
export function getPort() {
    return Number(process.env.VCEXP_FAST_API_PORT ?? process.env.EXPLORER_FAST_API_PORT ?? 3003);
}
export function getTipPollMs() {
    return Number(process.env.VCEXP_TIP_POLL_MS ?? 3000);
}
export function getLiveBlocksSkipGap() {
    const configured = Number(process.env.VCEXP_SUMMARY_LIVE_BLOCKS_SKIP_GAP);
    if (Number.isFinite(configured) && configured >= 0) {
        return configured;
    }
    return 3;
}
export function getSummaryLiveBlockLimit() {
    const configured = Number(process.env.VCEXP_SUMMARY_LIVE_BLOCK_LIMIT);
    if (Number.isFinite(configured) && configured > 0) {
        return Math.min(configured, 50);
    }
    return 10;
}
export function getZmqUrl(chainId) {
    const key = chainId === "vrm" ? "VCEXP_VRM_ZMQ" : "VCEXP_VRC_ZMQ";
    return process.env[key] || undefined;
}
export function getHost() {
    return process.env.VCEXP_FAST_API_HOST ?? "127.0.0.1";
}
function readPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
        return Math.floor(parsed);
    }
    return fallback;
}
export function isRateLimitEnabled() {
    const windowMinutes = Number(process.env.VCEXP_RATE_LIMIT_WINDOW_MINUTES ??
        process.env.BTCEXP_RATE_LIMIT_WINDOW_MINUTES ??
        15);
    return windowMinutes !== -1;
}
export function getRateLimitWindowMs() {
    const windowMinutes = Number(process.env.VCEXP_RATE_LIMIT_WINDOW_MINUTES ??
        process.env.BTCEXP_RATE_LIMIT_WINDOW_MINUTES ??
        15);
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
        return 15 * 60 * 1000;
    }
    return windowMinutes * 60 * 1000;
}
export function getRateLimitMax() {
    return readPositiveInt(process.env.VCEXP_RATE_LIMIT_MAX ?? process.env.BTCEXP_RATE_LIMIT_WINDOW_MAX_REQUESTS, 900);
}
export function getRateLimitCrawlerMax() {
    return readPositiveInt(process.env.VCEXP_RATE_LIMIT_CRAWLER_MAX ??
        process.env.BTCEXP_RATE_LIMIT_CRAWLER_MAX_REQUESTS, 120);
}
export function getRateLimitHeavyMax() {
    return readPositiveInt(process.env.VCEXP_RATE_LIMIT_HEAVY_MAX, 60);
}
export function getRateLimitSseMax() {
    return readPositiveInt(process.env.VCEXP_RATE_LIMIT_SSE_MAX, 4);
}
export function getRateLimitAllowIps() {
    const raw = process.env.VCEXP_RATE_LIMIT_ALLOW_IPS ?? "";
    return raw
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);
}
export function getRedisUrl() {
    return process.env.VCEXP_REDIS_URL ?? process.env.BTCEXP_REDIS_URL ?? undefined;
}
/** Route config for expensive read endpoints (1 minute window). */
export const heavyRateLimitRouteConfig = {
    config: {
        rateLimit: {
            max: getRateLimitHeavyMax(),
            timeWindow: 60_000,
        },
    },
};
/** Disable rate limiting on health probes. */
export const healthRateLimitRouteConfig = {
    config: {
        rateLimit: false,
    },
};
