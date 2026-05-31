import Link from "next/link";
import { EntityHero } from "@/components/explorer/BlockDetail";
import { TimeCell, formatHeight } from "@/components/explorer/ExplorerUi";
import { AddressRichlistBadge } from "@/components/explorer/address/AddressRichlistBadge";
import { AddressShareActions } from "@/components/explorer/address/AddressShareActions";
import type { AddressResult } from "@/lib/api/types";
import { CHAIN_EXPLORERS, chainBlockPath, type ChainId } from "@/lib/chainDisplay";
import { ellipsizeMiddle } from "@/lib/utils";

export function AddressHero({
  chainId,
  result,
}: {
  chainId: ChainId;
  result: AddressResult;
}) {
  const chain = CHAIN_EXPLORERS[chainId];
  const { balance } = result;

  return (
    <EntityHero
      eyebrow={`${chain.name} address`}
      title={ellipsizeMiddle(result.address, 28)}
      hash={result.address}
      badges={
        <div className="flex w-full flex-wrap items-center gap-2">
          <AddressRichlistBadge
            chainId={chainId}
            richlist={result.richlist}
            address={result.address}
          />
          <AddressShareActions chainId={chainId} address={result.address} />
          {result.found ? (
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              {balance.firstSeenHeight != null ? (
                <span>
                  First seen{" "}
                  <Link
                    href={chainBlockPath(chainId, balance.firstSeenHeight)}
                    className="font-semibold text-accent hover:underline"
                  >
                    {formatHeight(balance.firstSeenHeight)}
                  </Link>
                  {balance.firstSeenTime != null ? (
                    <>
                      {" "}
                      · <TimeCell time={balance.firstSeenTime} absolute />
                    </>
                  ) : null}
                </span>
              ) : null}
              {balance.lastSeenHeight != null ? (
                <span>
                  Last active{" "}
                  <Link
                    href={chainBlockPath(chainId, balance.lastSeenHeight)}
                    className="font-semibold text-accent hover:underline"
                  >
                    {formatHeight(balance.lastSeenHeight)}
                  </Link>
                </span>
              ) : null}
              <span className="text-sm font-semibold tabular-nums text-fg">
                {balance.balance.amount} {balance.balance.ticker}
              </span>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
