import { fetchChainSummary } from "@/lib/api/client";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";
import { getChainTipHeight, mergeChainHealth } from "@/lib/chainDisplay";
import { CHAIN_SUMMARY_POLL_MS } from "@/lib/liveDataConfig";
import {
  createOptimisticTipBlock,
  enrichBlocksFromPrevious,
  mergeBlocksForDisplay,
  shouldApplyOptimisticTip,
} from "@/lib/liveBlocksMerge";
import { LATEST_BLOCKS_COUNT } from "@/lib/chainBlocksDisplay";

export type ChainId = "vrm" | "vrc";

export interface TipEvent {
  height: number;
  hash: string;
  time: number;
}

export interface ChainLiveSnapshot {
  summary: ChainSummary;
  chainHeight: number | null;
  addressCount: number;
  latestBlocks: IndexedBlock[];
  heightPulse: boolean;
  lastUpdated: number;
  isRefreshing: boolean;
  error: string | null;
}

const CHAINS: ChainId[] = ["vrm", "vrc"];
const EMPTY_BLOCKS: IndexedBlock[] = [];
const EMPTY_TRANSACTIONS: ChainSummary["recentTransactions"] = [];
const POLL_MS = CHAIN_SUMMARY_POLL_MS;
const REFRESH_DEBOUNCE_MS = 2_000;

const listeners = new Map<ChainId, Set<() => void>>();
const snapshots = new Map<ChainId, ChainLiveSnapshot>();
const knownHashes = new Map<ChainId, Set<string>>();
const tipHeights = new Map<ChainId, number | null>();
const summaryInFlight = new Map<ChainId, Promise<void>>();
const debounceTimers = new Map<ChainId, ReturnType<typeof setTimeout>>();
const heightPulseTimers = new Map<ChainId, ReturnType<typeof setTimeout>>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pageVisible = true;
let bootstrapped = false;

function emptySummary(chainId: ChainId): ChainSummary {
  return {
    chainId,
    health: {
      id: chainId,
      ticker: chainId.toUpperCase(),
      name: chainId === "vrm" ? "Verium" : "VeriCoin",
      consensus: null,
      status: "unknown",
      trusted: false,
      trustLevel: "none",
      message: "Loading…",
      reasons: [],
      checks: {
        hasBlocks: false,
        startsAtGenesis: false,
        noHeightGaps: false,
        noUnresolvedSpends: false,
        hasRpcTip: false,
        nearTip: false,
        consistentTip: false,
      },
      heights: {
        bestRpcHeight: null,
        minIndexedHeight: null,
        maxIndexedHeight: null,
        lastIndexedHeight: null,
        blocksBehind: null,
        tipThreshold: 10,
      },
      counts: {
        indexedBlockCount: 0,
        expectedBlockCount: 0,
        gapCount: 0,
        unresolvedSpendCount: 0,
        addressCount: 0,
      },
      syncState: {
        status: null,
        statusMessage: null,
        updatedAt: null,
        lastIndexedHash: null,
      },
      sourceLabels: {
        blocks: "rpc+index",
        transactions: chainId === "vrm" ? "index-required" : "rpc-or-index",
        addressBalances: "index",
        richlist: "index",
        leaderboards: "index",
      },
    },
    latestBlocks: EMPTY_BLOCKS,
    recentTransactions: EMPTY_TRANSACTIONS,
    source: { label: "index", type: "index" },
  };
}

function createSnapshot(summary: ChainSummary): ChainLiveSnapshot {
  const snapshot = snapshotFromSummary(summary.chainId as ChainId, summary);
  return { ...snapshot, lastUpdated: Date.now() };
}

/** Stable snapshot for SSR / hydration (no Date.now(), uses props only). */
export function snapshotFromSummary(
  chainId: ChainId,
  summary?: ChainSummary | null,
): ChainLiveSnapshot {
  const resolved = summary ?? emptySummary(chainId);
  return {
    summary: resolved,
    chainHeight: getChainTipHeight(resolved.health),
    addressCount: resolved.health.counts.addressCount,
    latestBlocks: resolved.latestBlocks,
    heightPulse: false,
    lastUpdated: 0,
    isRefreshing: false,
    error: null,
  };
}

function seedKnownHashes(chainId: ChainId, blocks: IndexedBlock[]): void {
  const hashes = knownHashes.get(chainId) ?? new Set<string>();
  blocks.forEach((block) => hashes.add(block.hash));
  knownHashes.set(chainId, hashes);
}

function emit(chainId: ChainId): void {
  listeners.get(chainId)?.forEach((listener) => listener());
}

function setSnapshot(
  chainId: ChainId,
  next: ChainLiveSnapshot,
  notify = true,
): void {
  snapshots.set(chainId, next);
  if (notify) {
    emit(chainId);
  }
}

/** Lite summary polls omit txs; keep SSR/page-seeded rows until a full payload arrives. */
export function mergeRecentTransactions(
  prev: ChainSummary["recentTransactions"],
  next: ChainSummary["recentTransactions"],
): ChainSummary["recentTransactions"] {
  return next.length > 0 ? next : prev;
}

function mergeSummary(chainId: ChainId, next: ChainSummary): ChainLiveSnapshot {
  const prev = snapshots.get(chainId) ?? createSnapshot(next);
  const prevTopHeight = prev.summary.latestBlocks[0]?.height ?? null;
  const nextTopHeight = next.latestBlocks[0]?.height ?? null;

  const mergedBlocks = mergeBlocksForDisplay(
    enrichBlocksFromPrevious(prev.summary.latestBlocks, next.latestBlocks),
    chainId,
  );
  const latestBlockHeight =
    mergedBlocks[0]?.height ?? nextTopHeight ?? prevTopHeight ?? null;

  const mergedSummary: ChainSummary = {
    ...next,
    latestBlocks: mergedBlocks,
    recentTransactions: mergeRecentTransactions(
      prev.summary.recentTransactions,
      next.recentTransactions,
    ),
    health: mergeChainHealth(
      prev.summary.health,
      next.health,
      latestBlockHeight,
    ),
  };

  const nextHeight =
    mergedSummary.health.heights.bestRpcHeight ??
    mergedSummary.health.heights.maxIndexedHeight;
  const hashes = knownHashes.get(chainId) ?? new Set<string>();
  mergedSummary.latestBlocks
    .filter((block) => !hashes.has(block.hash))
    .forEach((block) => hashes.add(block.hash));
  mergedSummary.latestBlocks.forEach((block) => hashes.add(block.hash));
  knownHashes.set(chainId, hashes);

  let heightPulse = false;
  const previousTip = tipHeights.get(chainId) ?? null;
  if (nextHeight != null && previousTip != null && nextHeight > previousTip) {
    heightPulse = true;
    const existingTimer = heightPulseTimers.get(chainId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    heightPulseTimers.set(
      chainId,
      setTimeout(() => {
        heightPulseTimers.delete(chainId);
        const current = snapshots.get(chainId);
        if (current?.heightPulse) {
          setSnapshot(chainId, { ...current, heightPulse: false });
        }
      }, 700),
    );
  }

  if (nextHeight != null) {
    tipHeights.set(chainId, nextHeight);
  }

  return {
    summary: mergedSummary,
    chainHeight: getChainTipHeight(mergedSummary.health),
    addressCount: mergedSummary.health.counts.addressCount ?? 0,
    latestBlocks: mergedSummary.latestBlocks,
    heightPulse,
    lastUpdated: Date.now(),
    isRefreshing: false,
    error: null,
  };
}

function applyOptimisticTip(chainId: ChainId, tip: TipEvent): void {
  const current = snapshots.get(chainId);
  if (!current) {
    return;
  }

  const top = current.summary.latestBlocks[0];
  if (top && tip.height <= top.height) {
    return;
  }
  if (current.summary.latestBlocks.some((block) => block.hash === tip.hash)) {
    return;
  }

  const topHeight = top?.height ?? null;
  const nextBlocks = shouldApplyOptimisticTip(tip.height, topHeight)
    ? mergeBlocksForDisplay(
        [
          createOptimisticTipBlock(tip),
          ...current.summary.latestBlocks,
        ],
        chainId,
        LATEST_BLOCKS_COUNT,
      )
    : current.summary.latestBlocks;

  const hashes = knownHashes.get(chainId) ?? new Set<string>();
  if (!hashes.has(tip.hash)) {
    hashes.add(tip.hash);
  }
  knownHashes.set(chainId, hashes);

  let heightPulse = false;
  const previousTip = tipHeights.get(chainId) ?? null;
  if (previousTip != null && tip.height > previousTip) {
    heightPulse = true;
    const existingTimer = heightPulseTimers.get(chainId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    heightPulseTimers.set(
      chainId,
      setTimeout(() => {
        heightPulseTimers.delete(chainId);
        const latest = snapshots.get(chainId);
        if (latest?.heightPulse) {
          setSnapshot(chainId, { ...latest, heightPulse: false });
        }
      }, 700),
    );
  }
  tipHeights.set(chainId, tip.height);

  setSnapshot(chainId, {
    ...current,
    summary: {
      ...current.summary,
      latestBlocks: nextBlocks,
      health: {
        ...current.summary.health,
        checks: {
          ...current.summary.health.checks,
          nearTip: true,
          hasRpcTip: true,
        },
        heights: {
          ...current.summary.health.heights,
          bestRpcHeight: tip.height,
          lastIndexedHeight: Math.max(
            current.summary.health.heights.lastIndexedHeight ?? 0,
            tip.height,
          ),
          maxIndexedHeight: Math.max(
            current.summary.health.heights.maxIndexedHeight ?? 0,
            tip.height,
          ),
          blocksBehind: 0,
        },
        explorerStatus: {
          label: "Live",
          message: "Up to date.",
          syncing: false,
          blocksBehind: 0,
        },
      },
    },
    latestBlocks: nextBlocks,
    chainHeight: tip.height,
    heightPulse,
    lastUpdated: Date.now(),
    error: null,
  });
}

async function refreshSummary(chainId: ChainId): Promise<void> {
  if (!pageVisible) {
    return;
  }

  const inFlight = summaryInFlight.get(chainId);
  if (inFlight) {
    return inFlight;
  }

  const current = snapshots.get(chainId);
  if (current) {
    setSnapshot(chainId, { ...current, isRefreshing: true });
  }

  const promise = (async () => {
    try {
      const next = await fetchChainSummary(chainId);
      setSnapshot(chainId, mergeSummary(chainId, next));
    } catch (err) {
      const latest = snapshots.get(chainId);
      if (latest) {
        setSnapshot(chainId, {
          ...latest,
          isRefreshing: false,
          error: err instanceof Error ? err.message : "Failed to refresh",
        });
      }
    }
  })().finally(() => {
    summaryInFlight.delete(chainId);
  });

  summaryInFlight.set(chainId, promise);
  return promise;
}

function scheduleSummaryRefresh(chainId: ChainId): void {
  const existing = debounceTimers.get(chainId);
  if (existing) {
    clearTimeout(existing);
  }

  debounceTimers.set(
    chainId,
    setTimeout(() => {
      debounceTimers.delete(chainId);
      void refreshSummary(chainId);
    }, REFRESH_DEBOUNCE_MS),
  );
}

function stopPollLoop(): void {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPollLoop(): void {
  if (pollTimer != null || !pageVisible) {
    return;
  }

  pollTimer = setInterval(() => {
    if (!pageVisible) {
      return;
    }

    for (const chainId of CHAINS) {
      void refreshSummary(chainId);
    }
  }, POLL_MS);
}

function isPlaceholderSummary(summary: ChainSummary): boolean {
  return !summary.health.checks.hasBlocks;
}

function applySummary(
  chainId: ChainId,
  summary: ChainSummary,
  notify = false,
): void {
  seedKnownHashes(chainId, summary.latestBlocks);
  tipHeights.set(
    chainId,
    summary.health.heights.bestRpcHeight ??
      summary.health.heights.maxIndexedHeight ??
      null,
  );
  setSnapshot(chainId, createSnapshot(summary), notify);
}

function ensureChain(
  chainId: ChainId,
  initialSummary?: ChainSummary | null,
  notify = false,
): void {
  const incoming = initialSummary ?? emptySummary(chainId);
  const existing = snapshots.get(chainId);

  if (!existing) {
    applySummary(chainId, incoming, notify);
    return;
  }

  if (
    initialSummary &&
    isPlaceholderSummary(existing.summary) &&
    !isPlaceholderSummary(incoming)
  ) {
    applySummary(chainId, incoming, notify);
  }
}

/** Apply SSR page payload into the live store (layout may have seeded an empty placeholder). */
function seedPageSummary(chainId: ChainId, summary: ChainSummary): void {
  applySummary(chainId, summary, true);
}

export const chainLiveStore = {
  ensureChain,
  seedPageSummary,
  getSnapshot(chainId: ChainId): ChainLiveSnapshot {
    return snapshots.get(chainId) ?? snapshotFromSummary(chainId, null);
  },
  subscribe(chainId: ChainId, listener: () => void): () => void {
    if (!listeners.has(chainId)) {
      listeners.set(chainId, new Set());
    }
    listeners.get(chainId)!.add(listener);
    return () => {
      listeners.get(chainId)?.delete(listener);
    };
  },
  seed(initialVrm?: ChainSummary | null, initialVrc?: ChainSummary | null): void {
    ensureChain("vrm", initialVrm);
    ensureChain("vrc", initialVrc);
  },
  setPageVisible(nextVisible: boolean): void {
    if (pageVisible === nextVisible) {
      return;
    }

    pageVisible = nextVisible;
    if (nextVisible) {
      startPollLoop();
      for (const chainId of CHAINS) {
        void refreshSummary(chainId);
      }
      return;
    }

    stopPollLoop();
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();
  },
  handleTip(chainId: ChainId, tip: TipEvent): void {
    applyOptimisticTip(chainId, tip);
    scheduleSummaryRefresh(chainId);
  },
  bootstrap(options: {
    initialVrm?: ChainSummary | null;
    initialVrc?: ChainSummary | null;
    visible: boolean;
  }): void {
    chainLiveStore.seed(options.initialVrm, options.initialVrc);
    pageVisible = options.visible;

    if (bootstrapped) {
      if (options.visible) {
        startPollLoop();
      } else {
        stopPollLoop();
      }
      return;
    }

    bootstrapped = true;

    const needsInitialRefresh =
      options.initialVrm == null || options.initialVrc == null;
    if (options.visible && needsInitialRefresh) {
      for (const chainId of CHAINS) {
        void refreshSummary(chainId);
      }
    }

    if (options.visible) {
      startPollLoop();
    }
  },
};
