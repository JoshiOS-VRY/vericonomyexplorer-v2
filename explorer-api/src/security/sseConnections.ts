import { getRateLimitSseMax } from "../env.js";
import { getClientIp, isRateLimitAllowlisted } from "./clientIp.js";
import type { FastifyRequest } from "fastify";

const connectionsByIp = new Map<string, number>();

export function tryAcquireSseConnection(request: FastifyRequest): boolean {
  if (isRateLimitAllowlisted(request)) {
    return true;
  }

  const ip = getClientIp(request);
  const max = getRateLimitSseMax();
  const current = connectionsByIp.get(ip) ?? 0;
  if (current >= max) {
    return false;
  }

  connectionsByIp.set(ip, current + 1);
  return true;
}

export function releaseSseConnection(request: FastifyRequest): void {
  if (isRateLimitAllowlisted(request)) {
    return;
  }

  const ip = getClientIp(request);
  const current = connectionsByIp.get(ip) ?? 0;
  if (current <= 1) {
    connectionsByIp.delete(ip);
  } else {
    connectionsByIp.set(ip, current - 1);
  }
}
