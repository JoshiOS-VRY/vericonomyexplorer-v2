import Link from "next/link";
import { VrmAddressLabel } from "@/components/explorer/address/VrmAddressLink";
import type { RichlistItem } from "@/lib/api/types";
import { CHAIN_THEME, type ChainId } from "@/lib/chainDisplay";
import {
  formatSupplySharePct,
  supplySharePercent,
} from "@/lib/formatMarket";
import { cn, ellipsizeMiddle, formatCompactBalance } from "@/lib/utils";

interface RichlistBalanceListProps {
  chainId: ChainId;
  items: RichlistItem[];
  totalSupply: number | null;
  addressHref: (address: string) => string;
}

const RANK_STYLES: Record<number, string> = {
  1: "richlist-rank richlist-rank--gold",
  2: "richlist-rank richlist-rank--silver",
  3: "richlist-rank richlist-rank--bronze",
};

function computeListedSupplyShare(
  items: RichlistItem[],
  totalSupply: number | null,
): number | null {
  if (totalSupply == null || totalSupply <= 0) return null;

  let sum = 0;
  for (const item of items) {
    const amount = Number.parseFloat(item.balance.amount);
    const pct = supplySharePercent(amount, totalSupply);
    if (pct != null) sum += pct;
  }
  return sum > 0 ? sum : null;
}

export function RichlistBalanceList({
  chainId,
  items,
  totalSupply,
  addressHref,
}: RichlistBalanceListProps) {
  const theme = CHAIN_THEME[chainId];
  const listedSharePct = computeListedSupplyShare(items, totalSupply);
  const ticker = items[0]?.balance.ticker ?? "";

  return (
    <div
      className="richlist-balance-list"
      data-chain={chainId}
      style={
        {
          "--richlist-accent": theme.accent,
          "--richlist-accent-soft": theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <div className="richlist-balance-list__head" aria-hidden>
        <span>#</span>
        <span>Address</span>
        <span className="text-right">Balance</span>
      </div>

      <ul className="richlist-balance-list__body" role="list">
        {items.map((item) => {
          const amount = Number.parseFloat(item.balance.amount);
          const sharePct = supplySharePercent(amount, totalSupply);
          const shareLabel = formatSupplySharePct(amount, totalSupply);
          const href = addressHref(item.address);
          const isPodium = item.rank <= 3;

          return (
            <li key={item.address}>
              <Link
                href={href}
                prefetch
                className={cn(
                  "richlist-balance-list__row",
                  isPodium && "richlist-balance-list__row--podium",
                  item.rank === 1 && "richlist-balance-list__row--first",
                )}
              >
                <span
                  className={cn(
                    "richlist-rank",
                    RANK_STYLES[item.rank] ?? "richlist-rank--default",
                  )}
                >
                  {item.rank}
                </span>
                <div className="min-w-0">
                  <strong
                    className="richlist-balance-list__addr block truncate font-mono text-sm font-semibold text-fg sm:text-[15px]"
                    title={item.address}
                  >
                    {chainId === "vrm" ? (
                      <VrmAddressLabel address={item.address} maxLength={22} />
                    ) : (
                      ellipsizeMiddle(item.address, 22)
                    )}
                  </strong>
                  {sharePct != null && shareLabel ? (
                    <div
                      className="richlist-balance-list__share mt-2 flex min-w-0 items-center gap-2"
                      title={`${shareLabel} of total ${item.balance.ticker} supply`}
                    >
                      <span
                        className="richlist-balance-list__bar block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/70"
                        aria-hidden
                      >
                        <span
                          className="richlist-balance-list__bar-fill block h-full min-w-[2px] rounded-full"
                          style={{ width: `${Math.max(sharePct, 0.15)}%` }}
                        />
                      </span>
                      <span className="richlist-balance-list__pct shrink-0 text-[11px] font-semibold tabular-nums sm:text-xs">
                        {shareLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div
                  className="richlist-balance-list__balance text-right"
                  title={`${item.balance.amount} ${item.balance.ticker}`}
                >
                  <span className="block text-base font-bold tabular-nums text-fg sm:text-lg">
                    {formatCompactBalance(item.balance.amount)}
                  </span>
                  <span className="richlist-balance-list__ticker mt-0.5 block text-xs font-bold uppercase tracking-wide sm:text-sm">
                    {item.balance.ticker}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {listedSharePct != null && items.length > 0 ? (
        <footer className="richlist-balance-list__footer">
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">
              Top {items.length}
            </span>{" "}
            hold{" "}
            <span className="font-bold tabular-nums text-[var(--richlist-accent)]">
              {listedSharePct >= 10
                ? `${listedSharePct.toFixed(1)}%`
                : `${listedSharePct.toFixed(2)}%`}
            </span>{" "}
            of {ticker} supply
          </p>
        </footer>
      ) : null}
    </div>
  );
}
