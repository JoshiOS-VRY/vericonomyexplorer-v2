type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function isDisabled(): boolean {
  const windowMinutes = Number(
    process.env.VCEXP_RATE_LIMIT_WINDOW_MINUTES ??
      process.env.BTCEXP_RATE_LIMIT_WINDOW_MINUTES ??
      15,
  );
  return windowMinutes === -1;
}

export function getClientIpFromHeaders(headers: Headers): string {
  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return "unknown";
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number = WINDOW_MS,
): { allowed: boolean; retryAfterSec?: number } {
  if (isDisabled()) {
    return { allowed: true };
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getBffRateLimitMax(): number {
  return readPositiveInt(
    process.env.EXPLORER_BFF_RATE_LIMIT_MAX ?? process.env.VCEXP_RATE_LIMIT_MAX,
    120,
  );
}

export function getRpcRateLimitMax(): number {
  return readPositiveInt(process.env.EXPLORER_RPC_RATE_LIMIT_MAX, 10);
}

export function getAuthRateLimitMax(): number {
  return readPositiveInt(process.env.EXPLORER_AUTH_RATE_LIMIT_MAX, 30);
}

export type BffRateLimitTier = "rpc" | "internal" | "proxy" | "auth";

export function checkBffRateLimit(
  tier: BffRateLimitTier,
  ip: string,
  method: string,
): { allowed: boolean; retryAfterSec?: number } {
  let max: number;
  switch (tier) {
    case "rpc":
      max = getRpcRateLimitMax();
      break;
    case "auth":
      max = getAuthRateLimitMax();
      break;
    case "internal":
    case "proxy":
    default:
      max = getBffRateLimitMax();
      break;
  }

  const key = `${tier}:${ip}:${method}`;
  return checkRateLimit(key, max);
}
