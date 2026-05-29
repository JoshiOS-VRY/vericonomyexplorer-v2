import { getRateLimitAllowIps } from "../env.js";
function normalizeIp(ip) {
    if (ip.startsWith("::ffff:")) {
        return ip.slice(7);
    }
    return ip;
}
function isPrivateIpv4(ip) {
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        return false;
    }
    if (parts[0] === 10)
        return true;
    if (parts[0] === 127)
        return true;
    if (parts[0] === 192 && parts[1] === 168)
        return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
        return true;
    return false;
}
function isPrivateIpv6(ip) {
    const lower = ip.toLowerCase();
    if (lower === "::1")
        return true;
    if (lower.startsWith("fc") || lower.startsWith("fd"))
        return true;
    if (lower.startsWith("fe80:"))
        return true;
    return false;
}
export function isAllowlistedIp(ip) {
    const normalized = normalizeIp(ip);
    if (normalized === "127.0.0.1" || normalized === "::1") {
        return true;
    }
    if (normalized.includes(":")) {
        return isPrivateIpv6(normalized);
    }
    return isPrivateIpv4(normalized);
}
export function getClientIp(request) {
    const realIp = request.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) {
        return normalizeIp(realIp.trim());
    }
    return normalizeIp(request.ip);
}
export function isRateLimitAllowlisted(request) {
    const ip = getClientIp(request);
    if (isAllowlistedIp(ip)) {
        return true;
    }
    const extra = getRateLimitAllowIps();
    return extra.includes(ip);
}
