"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchChainSummary, getTipStreamUrl } from "@/lib/api/client";
import type { ChainSummary, IndexedBlock } from "@/lib/api/types";

const HIGHLIGHT_MS = 2_400;
const TOAST_MS = 4_500;

export interface LiveChainState {
  summary: ChainSummary;
  chainHeight: number | null;
  addressCount: number;
  latestBlocks: IndexedBlock[];
  newBlockHashes: Set<string>;
  toastBlock: IndexedBlock | null;
  heightPulse: boolean;
  lastUpdated: number;
  isRefreshing: boolean;
  error: string | null;
}

interface TipEvent {
  height: number;
  hash: string;
  time: number;
}

export function useLiveChainSummary(
  chainId: string,
  initialSummary: ChainSummary,
): LiveChainState {
  const knownHashesRef = useRef(new Set(initialSummary.latestBlocks.map((b) => b.hash)));
  const tipRef = useRef<number | null>(
    initialSummary.health.heights.bestRpcHeight ??
      initialSummary.health.heights.maxIndexedHeight,
  );

  const [summary, setSummary] = useState(initialSummary);
  const [newBlockHashes, setNewBlockHashes] = useState<Set<string>>(new Set());
  const [toastBlock, setToastBlock] = useState<IndexedBlock | null>(null);
  const [heightPulse, setHeightPulse] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySummary = useCallback((next: ChainSummary) => {
    const nextHeight =
      next.health.heights.bestRpcHeight ?? next.health.heights.maxIndexedHeight;
    const incomingNew = next.latestBlocks.filter((b) => !knownHashesRef.current.has(b.hash));

    if (incomingNew.length > 0) {
      incomingNew.forEach((b) => knownHashesRef.current.add(b.hash));
      setNewBlockHashes(new Set(incomingNew.map((b) => b.hash)));
      setToastBlock(incomingNew[0]);

      window.setTimeout(() => {
        setNewBlockHashes(new Set());
      }, HIGHLIGHT_MS);

      window.setTimeout(() => {
        setToastBlock(null);
      }, TOAST_MS);
    }

    next.latestBlocks.forEach((b) => knownHashesRef.current.add(b.hash));

    if (nextHeight != null && tipRef.current != null && nextHeight > tipRef.current) {
      setHeightPulse(true);
      window.setTimeout(() => setHeightPulse(false), 700);
    }

    if (nextHeight != null) {
      tipRef.current = nextHeight;
    }

    setSummary(next);
    setLastUpdated(Date.now());
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await fetchChainSummary(chainId);
      applySummary(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  }, [applySummary, chainId]);

  useEffect(() => {
    const source = new EventSource(getTipStreamUrl(chainId));

    source.addEventListener("tip", (event) => {
      try {
        const tip = JSON.parse(event.data) as TipEvent;
        if (tipRef.current != null && tip.height <= tipRef.current) return;
        void refresh();
      } catch {
        /* ignore malformed events */
      }
    });

    source.onerror = () => {
      setError("Live tip stream disconnected");
    };

    return () => source.close();
  }, [chainId, refresh]);

  const chainHeight =
    summary.health.heights.bestRpcHeight ?? summary.health.heights.maxIndexedHeight;

  return {
    summary,
    chainHeight,
    addressCount: summary.health.counts.addressCount,
    latestBlocks: summary.latestBlocks,
    newBlockHashes,
    toastBlock,
    heightPulse,
    lastUpdated,
    isRefreshing,
    error,
  };
}
