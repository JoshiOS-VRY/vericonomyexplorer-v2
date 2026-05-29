import { getRateLimitSseMax } from "../env.js";
import { getClientIp, isRateLimitAllowlisted } from "./clientIp.js";
const connectionsByIp = new Map();
export function tryAcquireSseConnection(request) {
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
export function releaseSseConnection(request) {
    if (isRateLimitAllowlisted(request)) {
        return;
    }
    const ip = getClientIp(request);
    const current = connectionsByIp.get(ip) ?? 0;
    if (current <= 1) {
        connectionsByIp.delete(ip);
    }
    else {
        connectionsByIp.set(ip, current - 1);
    }
}
