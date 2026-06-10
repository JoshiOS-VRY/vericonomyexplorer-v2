"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlockAdvancedPanel } from "@/components/explorer/block/BlockAdvancedPanel";
import { BlockDetailHero } from "@/components/explorer/BlockDetail";
import { BlockMetricStrip } from "@/components/explorer/block/BlockMetricStrip";
import { BlockMiningCard } from "@/components/explorer/block/BlockMiningCard";
import { BlockShareActions } from "@/components/explorer/block/BlockShareActions";
import { BlockStatusBar } from "@/components/explorer/block/BlockStatusBar";
import { BlockTxTable } from "@/components/explorer/block/BlockTxTable";
import { useLivePoll } from "@/hooks/useLivePoll";
import { useStableChainLive } from "@/hooks/useStableChainLive";
import { fetchBlockClient } from "@/lib/api/client";
import type { BlockResult, ChainSummary } from "@/lib/api/types";
import { type ChainId } from "@/lib/chainDisplay";
import { snapshotFromSummary } from "@/lib/chainLive/store";
import { ENTITY_LIVE_POLL_MS, NEAR_TIP_BLOCK_THRESHOLD } from "@/lib/liveDataConfig";

function blockLiveSignature(result: BlockResult): string {
  const block = result.block;
  if (!block) {
    return "missing";
  }

  const head = result.transactions[0];
  return [
    block.height,
    block.hash,
    block.txCount,
    result.transactions.length,
    head?.txid ?? "",
  ].join(":");
}

export function BlockDetailLive({
  chainId,
  hashOrHeight,
  initialResult,
  initialSummary,
  limit,
  offset,
}: {
  chainId: ChainId;
  hashOrHeight: string;
  initialResult: BlockResult;
  initialSummary: ChainSummary | null;
  limit: number;
  offset: number;
}) {
  const [result, setResult] = useState(initialResult);
  const signatureRef = useRef(blockLiveSignature(initialResult));
  const inFlightRef = useRef(false);
  const resolvedSummary =
    initialSummary ?? snapshotFromSummary(chainId, null).summary;
  const live = useStableChainLive(chainId, resolvedSummary);
  const block = result.block!;
  const chainHeight = live.chainHeight;
  const nearTip =
    chainHeight != null && block.height >= chainHeight - NEAR_TIP_BLOCK_THRESHOLD;

  useEffect(() => {
    signatureRef.current = blockLiveSignature(initialResult);
    setResult(initialResult);
  }, [initialResult]);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const next = await fetchBlockClient(chainId, hashOrHeight, { limit, offset });
      const nextSignature = blockLiveSignature(next);
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setResult(next);
      }
    } catch {
      /* keep last snapshot */
    } finally {
      inFlightRef.current = false;
    }
  }, [chainId, hashOrHeight, limit, offset]);

  useLivePoll({
    chainId,
    enabled: nearTip,
    intervalMs: ENTITY_LIVE_POLL_MS,
    onRefresh: refresh,
  });

  const blockTime = result.transactions.find((tx) => tx.time)?.time ?? block.time ?? null;

  return (
    <>
      <BlockDetailHero
        height={block.height}
        hash={block.hash}
        blockTime={blockTime}
        txCount={block.txCount}
        size={block.size ?? null}
        difficulty={block.difficulty}
        previousHash={block.previousHash}
        nextHash={block.nextHash}
        actions={
          <BlockShareActions chainId={chainId} hash={block.hash} height={block.height} />
        }
      />

      <BlockStatusBar result={result} />
      <BlockMiningCard result={result} chainId={chainId} />
      <BlockMetricStrip result={result} />
      <BlockTxTable result={result} blockHeight={block.height} chainId={chainId} />
      <BlockAdvancedPanel result={result} chainId={chainId} />
    </>
  );
}
