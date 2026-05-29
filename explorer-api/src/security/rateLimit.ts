import type { FastifyInstance } from "fastify";
import {
  getRateLimitCrawlerMax,
  getRateLimitMax,
  getRateLimitWindowMs,
  getRedisUrl,
  isRateLimitEnabled,
} from "../env.js";
import { getClientIp, isRateLimitAllowlisted } from "./clientIp.js";
import { getCrawlerFromUserAgent } from "./crawler.js";

function sanitizeRouteForLog(url: string): string {
  if (!url.includes("search")) {
    return url;
  }
  const idx = url.indexOf("?");
  return idx >= 0 ? `${url.slice(0, idx)}?…` : url;
}

async function createRedisClient(): Promise<unknown | undefined> {
  const url = getRedisUrl();
  if (!url) {
    return undefined;
  }

  const { Redis } = await import("ioredis");
  return new Redis(url, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
}

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  const { default: helmet } = await import("@fastify/helmet");
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  if (!isRateLimitEnabled()) {
    app.log.info("Rate limiting disabled (VCEXP_RATE_LIMIT_WINDOW_MINUTES=-1)");
    return;
  }

  const windowMs = getRateLimitWindowMs();
  const globalMax = getRateLimitMax();
  const crawlerMax = getRateLimitCrawlerMax();
  const redis = await createRedisClient();

  const { default: rateLimit } = await import("@fastify/rate-limit");
  await app.register(rateLimit, {
    global: true,
    max: (request) => {
      const ua = request.headers["user-agent"];
      const crawler = getCrawlerFromUserAgent(typeof ua === "string" ? ua : undefined);
      return crawler ? crawlerMax : globalMax;
    },
    timeWindow: windowMs,
    redis,
    skipOnError: true,
    enableDraftSpec: true,
    allowList: (request) => isRateLimitAllowlisted(request),
    keyGenerator: (request) => getClientIp(request),
    errorResponseBuilder: (request) => ({
      error: "Too many requests",
      requestId: request.id,
    }),
    onExceeded: (request) => {
      const ua = request.headers["user-agent"];
      const crawler = getCrawlerFromUserAgent(typeof ua === "string" ? ua : undefined);
      request.log.warn(
        {
          requestId: request.id,
          route: sanitizeRouteForLog(request.url),
          ip: getClientIp(request),
          crawler,
        },
        "rate limit exceeded",
      );
    },
  });

  app.log.info(
    { windowMs, globalMax, crawlerMax, redis: Boolean(redis) },
    "Rate limiting enabled",
  );
}
