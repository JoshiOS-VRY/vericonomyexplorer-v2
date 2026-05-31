"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AddressRichlistCard } from "@/components/explorer/address/AddressRichlistCard";
import { BcPanel } from "@/components/explorer/BlockchairUi";
import { clientApiFetch } from "@/lib/api/client";
import type { AddressRichlistInfo } from "@/lib/api/types";
import type { ChainId } from "@/lib/chainDisplay";

export function AddressRichlistRankClient({
  chainId,
  address,
}: {
  chainId: string;
  address: string;
}) {
  const [richlist, setRichlist] = useState<AddressRichlistInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await clientApiFetch<{ richlist: AddressRichlistInfo }>(
          `/${chainId}/address/${encodeURIComponent(address)}?includeRank=1&limit=1`,
        );
        if (!cancelled) {
          setRichlist(result.richlist);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chainId, address]);

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
