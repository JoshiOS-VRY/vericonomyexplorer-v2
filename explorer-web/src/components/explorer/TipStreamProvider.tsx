"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getTipStreamUrl } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";

interface TipEvent {
  height: number;
  hash: string;
  time: number;
}

type TipListener = (tip: TipEvent) => void;

interface ChainTipState {
  height: number | null;
  online: boolean;
}

interface TipStreamContextValue {
  subscribe: (chainId: string, listener: TipListener) => () => void;
  getChainState: (chainId: string) => ChainTipState;
}

const TipStreamContext = createContext<TipStreamContextValue | null>(null);

const CHAINS = ["vrm", "vrc"] as const;

export function TipStreamProvider({ children }: { children: ReactNode }) {
  const visible = usePageVisible();
  const listenersRef = useRef(new Map<string, Set<TipListener>>());
  const tipRef = useRef(new Map<string, number | null>([["vrm", null], ["vrc", null]]));
  const [chainState, setChainState] = useState<Record<string, ChainTipState>>({
    vrm: { height: null, online: true },
    vrc: { height: null, online: true },
  });

  const subscribe = useCallback((chainId: string, listener: TipListener) => {
    const listeners = listenersRef.current;
    if (!listeners.has(chainId)) {
      listeners.set(chainId, new Set());
    }
    listeners.get(chainId)!.add(listener);

    return () => {
      listeners.get(chainId)?.delete(listener);
    };
  }, []);

  const getChainState = useCallback(
    (chainId: string) => chainState[chainId] ?? { height: null, online: false },
    [chainState],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const sources = CHAINS.map((chainId) => {
      const source = new EventSource(getTipStreamUrl(chainId));

      source.addEventListener("tip", (event) => {
        try {
          const tip = JSON.parse(event.data) as TipEvent;
          const previous = tipRef.current.get(chainId) ?? null;
          tipRef.current.set(chainId, tip.height);
          setChainState((current) => ({
            ...current,
            [chainId]: { height: tip.height, online: true },
          }));

          if (previous == null || tip.height > previous) {
            listenersRef.current.get(chainId)?.forEach((listener) => listener(tip));
          }
        } catch {
          setChainState((current) => ({
            ...current,
            [chainId]: { height: current[chainId]?.height ?? null, online: false },
          }));
        }
      });

      source.onerror = () => {
        setChainState((current) => ({
          ...current,
          [chainId]: { height: current[chainId]?.height ?? null, online: false },
        }));
      };

      return source;
    });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [visible]);

  const value = useMemo(
    () => ({ subscribe, getChainState }),
    [getChainState, subscribe],
  );

  return <TipStreamContext.Provider value={value}>{children}</TipStreamContext.Provider>;
}

export function useTipStream(_chainId: string) {
  const context = useContext(TipStreamContext);
  if (!context) {
    throw new Error("useTipStream must be used within TipStreamProvider");
  }
  return context;
}

export function useChainTipState(chainId: string): ChainTipState {
  const { getChainState, subscribe } = useTipStream(chainId);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    return subscribe(chainId, () => {
      setRevision((value) => value + 1);
    });
  }, [chainId, subscribe]);

  void revision;
  return getChainState(chainId);
}
