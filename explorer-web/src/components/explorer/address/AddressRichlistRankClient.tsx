"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AddressRichlistCard } from "@/components/explorer/address/AddressRichlistCard";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { useLivePoll } from "@/hooks/useLivePoll";
import { fetchAddressClient } from "@/lib/addressLive";
import type { AddressRichlistInfo } from "@/lib/api/types";
import type { ChainId } from "@/lib/chainDisplay";
import { ENTITY_LIVE_POLL_MS } from "@/lib/liveDataConfig";

export function AddressRichlistRankClient({
  chainId,
  address,
}: {
  chainId: string;
  address: string;
}) {
  const [richlist, setRichlist] = useState<AddressRichlistInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      const result = await fetchAddressClient(chainId, address, {
        limit: 1,
        includeRank: true,
      });
      setRichlist(result.richlist);
      hasDataRef.current = true;
      setFailed(false);
    } catch {
      if (!hasDataRef.current) {
        setFailed(true);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [address, chainId]);

  useLivePoll({
    chainId: chainId as ChainId,
    intervalMs: ENTITY_LIVE_POLL_MS,
    onRefresh: refresh,
  });

  if (failed) {
    return (
      <BcPanel title="Rich list">
        <p className="text-sm text-fg-muted">Rich list rank is unavailable right now.</p>
      </BcPanel>
    );
  }

  if (!richlist) {
    return (
      <BcPanel title="Rich list">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading rank…
        </div>
      </BcPanel>
    );
  }

  return <AddressRichlistCard chainId={chainId as ChainId} richlist={richlist} address={address} />;
}
