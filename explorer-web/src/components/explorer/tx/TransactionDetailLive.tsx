'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EntityHero } from '@/components/explorer/BlockDetail';
import { TxAddressStory } from '@/components/explorer/tx/TxAddressStory';
import { TxAdvancedPanel } from '@/components/explorer/tx/TxAdvancedPanel';
import { TxBlockNav } from '@/components/explorer/tx/TxBlockNav';
import { TxFlowDiagram } from '@/components/explorer/tx/TxFlowDiagram';
import { TxMetricStrip } from '@/components/explorer/tx/TxMetricStrip';
import { TxRelatedActivityClient } from '@/components/explorer/tx/TxRelatedActivityClient';
import { TxShareActions } from '@/components/explorer/tx/TxShareActions';
import { TxStatusBar } from '@/components/explorer/tx/TxStatusBar';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useStableChainLive } from '@/hooks/useStableChainLive';
import { fetchTransactionClient } from '@/lib/api/client';
import type { ChainSummary, TransactionResult } from '@/lib/api/types';
import { CHAIN_EXPLORERS, type ChainId } from '@/lib/chainDisplay';
import { snapshotFromSummary } from '@/lib/chainLive/store';
import { ENTITY_LIVE_POLL_MS, NEAR_TIP_BLOCK_THRESHOLD } from '@/lib/liveDataConfig';
import { ellipsizeMiddle } from '@/lib/utils';

function txLiveSignature(result: TransactionResult): string {
  const tx = result.transaction;
  if (!tx) {
    return 'missing';
  }

  return [
    tx.blockHeight,
    tx.txid,
    result.confirmations ?? '',
    result.inputs.length,
    result.outputs.length,
  ].join(':');
}

export function TransactionDetailLive({
  chainId,
  txid,
  initialResult,
  initialSummary,
}: {
  chainId: ChainId;
  txid: string;
  initialResult: TransactionResult;
  initialSummary: ChainSummary | null;
}) {
  const [result, setResult] = useState(initialResult);
  const signatureRef = useRef(txLiveSignature(initialResult));
  const inFlightRef = useRef(false);
  const resolvedSummary = initialSummary ?? snapshotFromSummary(chainId, null).summary;
  const live = useStableChainLive(chainId, resolvedSummary);
  const tx = result.transaction!;
  const chainHeight = live.chainHeight;
  const nearTip = chainHeight != null && tx.blockHeight >= chainHeight - NEAR_TIP_BLOCK_THRESHOLD;
  const chain = CHAIN_EXPLORERS[chainId];

  useEffect(() => {
    signatureRef.current = txLiveSignature(initialResult);
    setResult(initialResult);
  }, [initialResult]);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const next = await fetchTransactionClient(chainId, txid);
      const nextSignature = txLiveSignature(next);
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setResult(next);
      }
    } catch {
      /* keep last snapshot */
    } finally {
      inFlightRef.current = false;
    }
  }, [chainId, txid]);

  useLivePoll({
    chainId,
    enabled: nearTip,
    intervalMs: ENTITY_LIVE_POLL_MS,
    onRefresh: refresh,
  });

  return (
    <>
      <EntityHero
        eyebrow={`${chain.name} transaction`}
        title={ellipsizeMiddle(tx.txid, 24)}
        hash={tx.txid}
        badges={<TxShareActions chainId={chainId} txid={tx.txid} />}
        meta={
          <span className="text-xs text-fg-muted">
            Block {tx.blockHeight.toLocaleString()} · position {tx.txIndex.toLocaleString()}
          </span>
        }
      />

      <TxStatusBar result={result} chainId={chainId} />
      <TxFlowDiagram result={result} chainId={chainId} />
      <TxMetricStrip result={result} />
      <TxAddressStory events={result.addressEvents} chainId={chainId} />
      <TxBlockNav result={result} chainId={chainId} />
      <TxAdvancedPanel result={result} chainId={chainId} />
      <TxRelatedActivityClient chainId={chainId} txid={tx.txid} liveEnabled={nearTip} />
    </>
  );
}
