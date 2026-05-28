import { AnimatedStatValue } from "@/components/explorer/AnimatedStatValue";
import type { ChainMarket } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import {
  formatBtcPrice,
  formatPercentChange,
  formatUsdCompact,
  formatUsdPrice,
} from "@/lib/formatMarket";
import { cn } from "@/lib/utils";
import { LazyPriceSparkline } from "./LazyPriceSparkline";

interface ChainMarketCardProps {
  chainId: "vrm" | "vrc";
  market: ChainMarket;
  embedded?: boolean;
  animated?: boolean;
  /** Fixed layout for side-by-side chain hubs (aligned block strips). */
  hubLayout?: boolean;
}

export function ChainMarketCard({
  chainId,
  market,
  embedded = false,
  animated = false,
  hubLayout = false,
}: ChainMarketCardProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const changePositive = market.change24h != null && market.change24h >= 0;
  const showOptionalMarketStats = !hubLayout;

  const body = (
    <>
      <div
        className={
          hubLayout
            ? "chain-hub-market-grid grid grid-cols-3 divide-x divide-border px-2"
            : "grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0"
        }
      >
        <MarketStat
          label="BTC Price"
          value={formatBtcPrice(market.btc)}
          numericValue={market.btc ?? undefined}
          formatFn={(n) => formatBtcPrice(n)}
          animated={animated}
          mono
          hubLayout={hubLayout}
        />
        <MarketStat
          label="USD Price"
          value={formatUsdPrice(market.usd)}
          numericValue={market.usd ?? undefined}
          formatFn={(n) => formatUsdPrice(n)}
          animated={animated}
          hubLayout={hubLayout}
        />
        <MarketStat
          label="Market Cap"
          value={formatUsdCompact(market.marketCap)}
          numericValue={market.marketCap ?? undefined}
          formatFn={(n) => formatUsdCompact(n)}
          animated={animated}
          className={hubLayout ? undefined : "col-span-2 sm:col-span-1"}
          hubLayout={hubLayout}
        />
        {showOptionalMarketStats && market.change24h != null ? (
          <MarketStat
            label="24h Change"
            value={formatPercentChange(market.change24h)}
            numericValue={market.change24h}
            formatFn={(n) => formatPercentChange(n)}
            animated={animated}
            valueClassName={changePositive ? "text-success" : "text-danger"}
          />
        ) : null}
        {showOptionalMarketStats && market.volume24h != null ? (
          <MarketStat
            label="24h Volume"
            value={formatUsdCompact(market.volume24h)}
            numericValue={market.volume24h}
            formatFn={(n) => formatUsdCompact(n)}
            animated={animated}
          />
        ) : null}
      </div>

      {hubLayout ? null : market.priceHistory24h.length > 1 ? (
        <div className="border-t border-border px-2 py-2">
          <LazyPriceSparkline
            data={market.priceHistory24h}
            ticker={config.ticker}
          />
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className={hubLayout ? "chain-hub-market" : undefined}>
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b border-border px-3 py-1.5",
            hubLayout && "chain-hub-section-head",
          )}
        >
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
            Market
          </h4>
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
            {market.source !== "unavailable"
              ? market.source
              : "price unavailable"}
          </span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-fg">{config.name} Market</h3>
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {market.source !== "unavailable"
              ? market.source
              : "price unavailable"}
          </span>
        </div>
      </div>
      {body}
    </section>
  );
}

function MarketStat({
  label,
  value,
  mono = false,
  className,
  valueClassName,
  animated = false,
  numericValue,
  formatFn,
  hubLayout = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
  valueClassName?: string;
  animated?: boolean;
  numericValue?: number;
  formatFn?: (value: number) => string;
  hubLayout?: boolean;
}) {
  if (hubLayout) {
    return (
      <div className={cn("chain-hub-stat-cell px-2 py-1.5", className)}>
        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
          {label}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-xs font-semibold tabular-nums text-fg",
            mono && "text-[11px]",
            valueClassName,
          )}
        >
          {animated ? (
            <AnimatedStatValue
              value={value}
              numericValue={numericValue}
              formatFn={formatFn}
              className={valueClassName}
            />
          ) : (
            value
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-bold tabular-nums text-fg",
          mono && "text-base",
          valueClassName,
        )}
      >
        {animated ? (
          <AnimatedStatValue
            value={value}
            numericValue={numericValue}
            formatFn={formatFn}
            className={valueClassName}
          />
        ) : (
          value
        )}
      </div>
    </div>
  );
}
