const chainHandlers = [];
const globalHandlers = [];
const chainInFlight = new Map();
const globalInFlight = new Map();
export function registerChainTipRefresh(handler) {
    chainHandlers.push(handler);
}
export function registerGlobalTipRefresh(key, refresh) {
    globalHandlers.push({ key, refresh });
}
function scheduleCoalesced(inFlight, key, task) {
    if (inFlight.has(key)) {
        return;
    }
    const promise = task().finally(() => {
        inFlight.delete(key);
    });
    inFlight.set(key, promise);
}
export function refreshOnTip(chainId) {
    scheduleCoalesced(chainInFlight, chainId, async () => {
        await Promise.allSettled(chainHandlers.map((handler) => handler(chainId)));
    });
    for (const handler of globalHandlers) {
        scheduleCoalesced(globalInFlight, handler.key, handler.refresh);
    }
}
