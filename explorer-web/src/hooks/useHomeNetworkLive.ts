'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { fetchHomeNetwork } from '@/lib/api/client';
import { usePageVisible } from '@/hooks/usePageVisible';
import type { HomeNetworkPayload, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import { mergeHomeNetworkPayload } from '@/lib/enrichNetwork';
import { NETWORK_LIVE_POLL_MS } from '@/lib/liveDataConfig';

const NETWORK_POLL_MS = NETWORK_LIVE_POLL_MS;

function vrmNetworkReceived(stats: VrmNetworkStats): boolean {
  return (
    stats.hashrateKhPerMin != null ||
    stats.avgBlockTimeMin != null ||
    stats.difficulty != null ||
    stats.blocks != null ||
    stats.supply != null
  );
}

function vrcNetworkReceived(stats: VrcNetworkStats): boolean {
  return (
    stats.difficulty != null ||
    stats.blocks != null ||
    stats.supply != null ||
    stats.interestRatePercent != null ||
    stats.netStakeWeight != null
  );
}

function applyNetworkRefresh(
  prev: HomeNetworkPayload,
  next: HomeNetworkPayload
): HomeNetworkPayload {
  const merged = mergeHomeNetworkPayload(prev, next);

  return {
    fetchedAt: merged.fetchedAt,
    vrm: vrmNetworkReceived(next.vrm) ? merged.vrm : prev.vrm,
    vrc: vrcNetworkReceived(next.vrc) ? merged.vrc : prev.vrc,
  };
}

export function useHomeNetworkLive(initialNetwork: HomeNetworkPayload) {
  const { subscribe } = useTipStream('vrm');
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
      setNetwork((prev) => applyNetworkRefresh(prev, next));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh network');
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    void refresh();

    const unsubVrm = subscribe('vrm', () => {
      void refresh();
    });
    const unsubVrc = subscribe('vrc', () => {
      void refresh();
    });

    const interval = window.setInterval(() => {
      void refresh();
    }, NETWORK_POLL_MS);

    return () => {
      unsubVrm();
      unsubVrc();
      window.clearInterval(interval);
    };
  }, [refresh, subscribe, visible]);

  return { network, isRefreshing, error };
}
