import Link from "next/link";
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

export function RichlistBalanceList({
  chainId,
  items,
  totalSupply,
  addressHref,
}: RichlistBalanceListProps) {
  const theme = CHAIN_THEME[chainId];

  return (
    <div
      className="richlist-balance-list overflow-hidden rounded-xl border border-border"
      data-chain={chainId}
      style={
        {
          "--richlist-accent": theme.accent,
          "--richlist-accent-soft": theme.accentSoft,
        } as React.CSSProperties
      }
    >
      <div className="richlist-balance-list__head hidden grid-cols-[2.75rem_1fr_auto] gap-3 border-b border-border bg-bg-subtle/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle sm:grid">
        <span>#</span>
        <span>Address</span>
        <span className="text-right">Balance</span>
      </div>
      {items.map((item) => {
        const amount = Number.parseFloat(item.balance.amount);
        const sharePct = supplySharePercent(amount, totalSupply);
        const shareLabel = formatSupplySharePct(amount, totalSupply);
        const href = addressHref(item.address);

        return (
          <Link
            key={item.address}
            href={href}
            prefetch
            className="richlist-balance-list__row group relative grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 border-t border-border px-4 py-3.5 transition first:border-t-0 hover:bg-[color-mix(in_srgb,var(--richlist-accent)_6%,transparent)] sm:py-4"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                RANK_STYLES[item.rank] ?? "richlist-rank richlist-rank--default",
              )}
            >
              {item.rank}
            </span>
            <div className="min-w-0">
              <strong className="block truncate font-mono text-sm font-semibold text-fg group-hover:text-[var(--richlist-accent)] sm:text-base">
                {ellipsizeMiddle(item.address, 22)}
              </strong>
              {sharePct != null && shareLabel ? (
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <span
                    className="richlist-balance-list__bar block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/80"
                    aria-hidden
                  >
                    <span
                      className="richlist-balance-list__bar-fill block h-full min-w-[2px] rounded-full"
                      style={{ width: `${Math.max(sharePct, 0.15)}%` }}
                    />
                  </span>
                  <span
                    className="richlist-balance-list__pct shrink-0 text-[11px] font-semibold tabular-nums text-fg-muted sm:text-xs"
                    title={`${shareLabel} of total ${item.balance.ticker} supply`}
                  >
                    {shareLabel}
                  </span>
                </div>
              ) : null}
            </div>
            <div
              className="text-right"
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
        );
      })}
    </div>
  );
}
