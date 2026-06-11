import type { ChainId } from '../types.js';

type ChainRefreshHandler = (chainId: ChainId) => Promise<void>;
type GlobalRefreshHandler = { key: string; refresh: () => Promise<void> };

const chainHandlers: ChainRefreshHandler[] = [];
const globalHandlers: GlobalRefreshHandler[] = [];

const chainInFlight = new Map<string, Promise<void>>();
const globalInFlight = new Map<string, Promise<void>>();

export function registerChainTipRefresh(handler: ChainRefreshHandler): void {
  chainHandlers.push(handler);
}

export function registerGlobalTipRefresh(key: string, refresh: () => Promise<void>): void {
  globalHandlers.push({ key, refresh });
}

function scheduleCoalesced(
  inFlight: Map<string, Promise<void>>,
  key: string,
  task: () => Promise<void>
): void {
  if (inFlight.has(key)) {
    return;
  }

  const promise = task().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
}

export function refreshOnTip(chainId: ChainId): void {
  scheduleCoalesced(chainInFlight, chainId, async () => {
    await Promise.allSettled(chainHandlers.map((handler) => handler(chainId)));
  });

  for (const handler of globalHandlers) {
    scheduleCoalesced(globalInFlight, handler.key, handler.refresh);
  }
}
