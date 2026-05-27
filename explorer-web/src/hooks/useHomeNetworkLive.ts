"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTipStream } from "@/components/explorer/TipStreamProvider";
import { fetchHomeNetwork } from "@/lib/api/client";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { HomeNetworkPayload } from "@/lib/api/types";
import { mergeHomeNetworkPayload } from "@/lib/enrichNetwork";

const FALLBACK_INTERVAL_MS = 90_000;

export function useHomeNetworkLive(initialNetwork: HomeNetworkPayload) {
  const { subscribe } = useTipStream("vrm");
  const visible = usePageVisible();
  const [network, setNetwork] = useState(initialNetwork);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!visible || inFlightRef.current) return;

    inFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const next = await fetchHomeNetwork();
      setNetwork((prev) => mergeHomeNetworkPayload(prev, next));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh network");
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const unsubVrm = subscribe("vrm", () => {
      void refresh();
    });
    const unsubVrc = subscribe("vrc", () => {
      void refresh();
    });

    const interval = window.setInterval(() => {
      void refresh();
    }, FALLBACK_INTERVAL_MS);

    return () => {
      unsubVrm();
      unsubVrc();
      window.clearInterval(interval);
    };
  }, [refresh, subscribe, visible]);

  return { network, isRefreshing, error };
}
