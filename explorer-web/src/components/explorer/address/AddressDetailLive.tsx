"use client";

import Link from "next/link";
import { AddressBalanceChartClient } from "@/components/explorer/address/AddressBalanceChartClient";
import { AddressHero } from "@/components/explorer/address/AddressHero";
import { AddressMetricStrip } from "@/components/explorer/address/AddressMetricStrip";
import { AddressRichlistRankClient } from "@/components/explorer/address/AddressRichlistRankClient";
import { AddressTransactionsTable } from "@/components/explorer/address/AddressTransactionsTable";
import { AddressUtxoPanelClient } from "@/components/explorer/address/AddressUtxoPanelClient";
import { useAddressLive } from "@/hooks/useAddressLive";
import type { AddressResult } from "@/lib/api/types";
import { chainAddressPath, type ChainId } from "@/lib/chainDisplay";
import { ADDRESS_UTXOS_ENABLED } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

export function AddressDetailLive({
  chainId,
  initialResult,
  limit,
  offset,
  utxoLimit,
  utxoOffset,
}: {
  chainId: ChainId;
  initialResult: AddressResult;
  limit: number;
  offset: number;
  utxoLimit: number;
  utxoOffset: number;
}) {
  const { result, isRefreshing } = useAddressLive(
    initialResult,
    chainId,
    initialResult.address,
    { limit, offset },
  );
  const basePath = chainAddressPath(chainId, result.address);

  return (
    <div className={cn(isRefreshing && "opacity-[0.98] transition-opacity")}>
      <AddressHero chainId={chainId} result={result} />
      <AddressMetricStrip result={result} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AddressBalanceChartClient chainId={chainId} address={result.address} />
        </div>
        <div>
          <AddressRichlistRankClient chainId={chainId} address={result.address} />
        </div>
      </div>

      {ADDRESS_UTXOS_ENABLED ? (
        <div className="mt-6">
          <AddressUtxoPanelClient
            chainId={chainId}
            address={result.address}
            basePath={basePath}
            utxoLimit={utxoLimit}
            utxoOffset={utxoOffset}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <AddressTransactionsTable
          chainId={chainId}
          result={result}
          basePath={basePath}
          utxoLimit={utxoLimit}
          utxoOffset={utxoOffset}
        />
      </div>
    </div>
  );
}
