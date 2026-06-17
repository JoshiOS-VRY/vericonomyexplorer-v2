import { getRateLimitSseMax } from '../env.js';
import { getClientIp, isRateLimitAllowlisted } from './clientIp.js';
const connectionsByKey = new Map();
function sseConnectionKey(request, chainId) {
    return `${getClientIp(request)}:${chainId}`;
}
export function tryAcquireSseConnection(request, chainId) {
    if (isRateLimitAllowlisted(request)) {
        return true;
    }
    const key = sseConnectionKey(request, chainId);
    const max = getRateLimitSseMax();
    const current = connectionsByKey.get(key) ?? 0;
    if (current >= max) {
        return false;
    }
    connectionsByKey.set(key, current + 1);
    return true;
}
export function releaseSseConnection(request, chainId) {
    if (isRateLimitAllowlisted(request)) {
        return;
    }
    const key = sseConnectionKey(request, chainId);
    const current = connectionsByKey.get(key) ?? 0;
    if (current <= 1) {
        connectionsByKey.delete(key);
    }
    else {
        connectionsByKey.set(key, current - 1);
    }
}
