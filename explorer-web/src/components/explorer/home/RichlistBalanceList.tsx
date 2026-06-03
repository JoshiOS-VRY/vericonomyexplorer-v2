import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Copy,
  Crown,
  Medal,
  Trophy,
} from "lucide-react";
import { formatHeight } from "@/components/explorer/ExplorerUi";
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

const PODIUM_LABELS: Record<number, string> = {
  1: "Top holder",
  2: "2nd",
  3: "3rd",
};

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank] ?? "richlist-rank richlist-rank--default";
  const iconClass = "h-4 w-4 shrink-0";

  if (rank === 1) {
    return (
      <span className={cn("richlist-rank", style)} aria-hidden>
        <Crown className={iconClass} strokeWidth={2.25} />
        <span className="sr-only">Rank 1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className={cn("richlist-rank", style)} aria-hidden>
        <Medal className={iconClass} strokeWidth={2.25} />
        <span className="sr-only">Rank 2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className={cn("richlist-rank", style)} aria-hidden>
        <Trophy className={iconClass} strokeWidth={2.25} />
        <span className="sr-only">Rank 3</span>
      </span>
    );
  }

  return (
    <span className={cn("richlist-rank", style)} aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  );
}

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
      <div
        className="richlist-balance-list__head"
        aria-hidden
      >
        <span>#</span>
        <span>Address</span>
        <span className="richlist-balance-list__head-activity hidden md:block">
          Activity
        </span>
        <span className="text-right">Balance</span>
      </div>

      <ul className="richlist-balance-list__body" role="list">
        {items.map((item) => {
          const amount = Number.parseFloat(item.balance.amount);
          const sharePct = supplySharePercent(amount, totalSupply);
          const shareLabel = formatSupplySharePct(amount, totalSupply);
          const href = addressHref(item.address);
          const isPodium = item.rank <= 3;
          const podiumLabel = PODIUM_LABELS[item.rank];

          return (
            <li key={item.address}>
              <Link
                href={href}
                prefetch
                aria-label={`${item.address}, rank ${item.rank}, ${item.balance.amount} ${item.balance.ticker}`}
                className={cn(
                  "richlist-balance-list__row",
                  isPodium && "richlist-balance-list__row--podium",
                  item.rank === 1 && "richlist-balance-list__row--first",
                )}
              >
              <RankBadge rank={item.rank} />

              <div className="richlist-balance-list__address min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <strong
                        className="richlist-balance-list__addr truncate font-mono text-sm font-semibold text-fg sm:text-[15px]"
                        title={item.address}
                      >
                        {ellipsizeMiddle(item.address, 22)}
                      </strong>
                      {podiumLabel ? (
                        <span className="richlist-balance-list__tier shrink-0">
                          {podiumLabel}
                        </span>
                      ) : null}
                    </div>
                    <span className="richlist-balance-list__tx-mobile mt-1 flex items-center gap-1 text-[11px] font-medium text-fg-muted md:hidden">
                      <Activity className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      {formatHeight(item.txCount)} txs
                    </span>
                  </div>
                  <button
                    type="button"
                    data-copy-value={item.address}
                    data-copy-label="Copy"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="richlist-balance-list__copy copy-btn relative z-10 shrink-0 rounded-md border border-transparent p-1.5 text-fg-subtle transition hover:border-border hover:bg-bg-subtle hover:text-fg"
                    aria-label={`Copy address ${item.address}`}
                    title="Copy address"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                {sharePct != null && shareLabel ? (
                  <div
                    className="richlist-balance-list__share mt-2.5 flex min-w-0 items-center gap-2.5"
                    title={`${shareLabel} of total ${item.balance.ticker} supply`}
                  >
                    <span
                      className="richlist-balance-list__bar block h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border/70"
                      aria-hidden
                    >
                      <span
                        className="richlist-balance-list__bar-fill block h-full min-w-[3px] rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.max(sharePct, 0.2)}%` }}
                      />
                    </span>
                    <span className="richlist-balance-list__pct shrink-0 text-[11px] font-bold tabular-nums sm:text-xs">
                      {shareLabel}
                    </span>
                    <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle sm:inline">
                      supply
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="richlist-balance-list__activity hidden tabular-nums md:flex md:flex-col md:items-end md:justify-center">
                <span className="flex items-center gap-1 text-sm font-bold text-fg">
                  <Activity
                    className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--richlist-accent)_70%,var(--fg-muted))]"
                    aria-hidden
                  />
                  {formatHeight(item.txCount)}
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                  txs
                </span>
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

              <ArrowUpRight
                className="richlist-balance-list__arrow h-4 w-4 shrink-0 text-fg-subtle"
                aria-hidden
              />
              </Link>
            </li>
          );
        })}
      </ul>

      {listedSharePct != null && items.length > 0 ? (
        <footer className="richlist-balance-list__footer">
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">
              Top {formatHeight(items.length)}
            </span>{" "}
            hold{" "}
            <span className="font-bold tabular-nums text-[var(--richlist-accent)]">
              {listedSharePct >= 10
                ? `${listedSharePct.toFixed(1)}%`
                : `${listedSharePct.toFixed(2)}%`}
            </span>{" "}
            of {ticker} supply
          </p>
          <span className="richlist-balance-list__footer-dots" aria-hidden>
            {items.slice(0, 5).map((item) => {
              const pct = supplySharePercent(
                Number.parseFloat(item.balance.amount),
                totalSupply,
              );
              return (
                <span
                  key={item.address}
                  className="richlist-balance-list__footer-dot"
                  style={{
                    flex: Math.max(pct ?? 1, 0.5),
                  }}
                  title={`#${item.rank} ${formatSupplySharePct(Number.parseFloat(item.balance.amount), totalSupply) ?? ""}`}
                />
              );
            })}
          </span>
        </footer>
      ) : null}
    </div>
  );
}
