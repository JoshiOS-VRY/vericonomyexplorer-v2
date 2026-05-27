"use client";

import { useEffect, useState } from "react";
import { AddressUtxoPanel } from "@/components/explorer/address/AddressUtxoPanel";
import { AddressUtxoPanelSkeleton } from "@/components/explorer/address/AddressSectionSkeleton";
import { fetchAddressUtxosClient } from "@/lib/api/client";
import type { AddressUtxosResult } from "@/lib/api/types";

export function AddressUtxoPanelLoader({
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setError(null);
      setUtxos(null);

      try {
        const data = await fetchAddressUtxosClient(chainId, address, {
          limit: utxoLimit,
          offset: utxoOffset,
        });
        if (!cancelled) {
          setUtxos(data);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load UTXO data.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, chainId, utxoLimit, utxoOffset]);

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-bg-panel px-5 py-4 shadow-sm">
        <p className="text-sm text-fg-muted">{error}</p>
      </section>
    );
  }

  if (!utxos) {
    return <AddressUtxoPanelSkeleton />;
  }

  return <AddressUtxoPanel utxos={utxos} basePath={basePath} />;
}
