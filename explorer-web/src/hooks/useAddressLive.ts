"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePoll } from "@/hooks/useLivePoll";
import {
  fetchAddressClient,
  isSameAddressLiveSnapshot,
} from "@/lib/addressLive";
import type { AddressResult } from "@/lib/api/types";
import type { ChainId } from "@/lib/chainDisplay";
import { ENTITY_LIVE_POLL_MS } from "@/lib/liveDataConfig";

export function useAddressLive(
  initial: AddressResult,
  chainId: ChainId,
  address: string,
  params: { limit: number; offset: number; includeRank?: boolean },
  enabled = true,
) {
  const [result, setResult] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const resultRef = useRef(initial);

  useEffect(() => {
    resultRef.current = initial;
    setResult(initial);
  }, [initial]);

  const refresh = useCallback(async () => {
    if (!enabled || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsRefreshing(true);

    try {
      const next = await fetchAddressClient(chainId, address, params);
      if (!isSameAddressLiveSnapshot(resultRef.current, next)) {
        resultRef.current = next;
        setResult(next);
      }
    } catch {
      /* keep last good snapshot */
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [address, chainId, enabled, params.limit, params.offset, params.includeRank]);

  useLivePoll({
    chainId,
    enabled,
    intervalMs: ENTITY_LIVE_POLL_MS,
    onRefresh: refresh,
  });

  return { result, isRefreshing, refresh };
}
