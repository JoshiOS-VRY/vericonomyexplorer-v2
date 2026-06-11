'use client';

import { useEffect } from 'react';
import { useTipStream } from '@/components/explorer/TipStreamProvider';
import { chainLiveStore } from '@/lib/chainLive/store';
import type { ChainSummary } from '@/lib/api/types';
import { usePageVisible } from '@/hooks/usePageVisible';

export function ChainLiveBootstrap({
  initialVrmSummary,
  initialVrcSummary,
}: {
  initialVrmSummary?: ChainSummary | null;
  initialVrcSummary?: ChainSummary | null;
}) {
  const visible = usePageVisible();
  const { subscribe } = useTipStream('vrm');

  useEffect(() => {
    chainLiveStore.bootstrap({
      initialVrm: initialVrmSummary,
      initialVrc: initialVrcSummary,
      visible,
    });
    // Bootstrap only needs to run once; live updates flow through the shared store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    chainLiveStore.setPageVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const unsubs = (['vrm', 'vrc'] as const).map((chainId) =>
      subscribe(chainId, (tip) => {
        chainLiveStore.handleTip(chainId, tip);
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [subscribe, visible]);

  return null;
}
