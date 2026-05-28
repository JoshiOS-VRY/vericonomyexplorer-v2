"use client";

import { useEffect, useState } from "react";
import { AddressUtxoPanel } from "@/components/explorer/address/AddressUtxoPanel";
import { AddressUtxoPanelSkeleton } from "@/components/explorer/address/AddressSectionSkeleton";
import { fetchAddressUtxosClient } from "@/lib/api/client";
import type { AddressUtxosResult } from "@/lib/api/types";
import { ADDRESS_UTXOS_ENABLED } from "@/lib/featureFlags";

export function AddressUtxoPanelClient({
  chainId,
  address,
  basePath,
  utxoLimit,
  utxoOffset,
}: {
  chainId: string;
  address: string;
  basePath: string;
  utxoLimit: number;
  utxoOffset: number;
}) {
  const [utxos, setUtxos] = useState<AddressUtxosResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ADDRESS_UTXOS_ENABLED) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const result = await fetchAddressUtxosClient(chainId, address, {
          limit: utxoLimit,
          offset: utxoOffset,
        });
        if (!cancelled) {
          setUtxos(result);
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
  }, [chainId, address, utxoLimit, utxoOffset]);

  if (!ADDRESS_UTXOS_ENABLED) {
    return null;
  }

  if (failed) {
    return (
      <section className="rounded-lg border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <p className="text-sm text-fg-muted">Unable to load UTXO data.</p>
      </section>
    );
  }

  if (!utxos) {
    return <AddressUtxoPanelSkeleton />;
  }

  return <AddressUtxoPanel utxos={utxos} basePath={basePath} />;
}
