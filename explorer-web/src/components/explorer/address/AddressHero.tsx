import Link from "next/link";
import { EntityHero } from "@/components/explorer/BlockDetail";
import { TimeCell, formatHeight } from "@/components/explorer/ExplorerUi";
import { AddressRichlistBadge } from "@/components/explorer/address/AddressRichlistBadge";
import { AddressShareActions } from "@/components/explorer/address/AddressShareActions";
import { EXPLORER_DATA_INCOMPLETE, formatExplorerUserMessage } from "@/lib/explorerCopy";
import type { AddressResult } from "@/lib/api/types";
import { cn, ellipsizeMiddle } from "@/lib/utils";

export function AddressHero({ result }: { result: AddressResult }) {
  const { balance } = result;

  return (
    <EntityHero
      eyebrow="Verium address"
      title={ellipsizeMiddle(result.address, 28)}
      hash={result.address}
      badges={
        <div className="flex w-full flex-wrap items-center gap-2">
          <AddressRichlistBadge richlist={result.richlist} address={result.address} />
          <AddressShareActions address={result.address} />
          {result.found ? (
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              {balance.firstSeenHeight != null ? (
                <span>
                  First seen{" "}
                  <Link
                    href={`/vrm/block/${balance.firstSeenHeight}`}
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
                    href={`/vrm/block/${balance.lastSeenHeight}`}
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
      footer={
        result.trusted === false ? (
          <p className={cn("border-t border-warning/20 bg-warning/5 px-4 py-2.5 text-xs text-warning sm:px-5")}>
            {formatExplorerUserMessage(result.source.message || EXPLORER_DATA_INCOMPLETE)}
          </p>
        ) : null
      }
    />
  );
}
