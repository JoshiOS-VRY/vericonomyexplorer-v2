import type { FastifyRequest } from "fastify";
import { getRateLimitAllowIps } from "../env.js";

function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80:")) return true;
  return false;
}

export function isAllowlistedIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (normalized === "127.0.0.1" || normalized === "::1") {
    return true;
  }
  if (normalized.includes(":")) {
    return isPrivateIpv6(normalized);
  }
  return isPrivateIpv4(normalized);
}

function readIpHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  if (typeof value === "string" && value.trim()) {
    return normalizeIp(value.trim());
  }
  return undefined;
}

export function getClientIp(request: FastifyRequest): string {
  // Cloudflare sets CF-Connecting-IP; Caddy/nginx may forward it as X-Real-IP.
  return (
    readIpHeader(request, "cf-connecting-ip") ??
    readIpHeader(request, "x-real-ip") ??
    normalizeIp(request.ip)
  );
}

export function isRateLimitAllowlisted(request: FastifyRequest): boolean {
  const ip = getClientIp(request);
  if (isAllowlistedIp(ip)) {
    return true;
  }

  const extra = getRateLimitAllowIps();
  return extra.includes(ip);
}
