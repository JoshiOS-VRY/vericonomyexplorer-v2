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
}

export function ChainMarketCard({
  chainId,
  market,
  embedded = false,
  animated = false,
}: ChainMarketCardProps) {
  const config = CHAIN_EXPLORERS[chainId];
  const changePositive = market.change24h != null && market.change24h >= 0;

  const body = (
    <>
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0">
        <MarketStat
          label="BTC Price"
          value={formatBtcPrice(market.btc)}
          numericValue={market.btc ?? undefined}
          formatFn={(n) => formatBtcPrice(n)}
          animated={animated}
          mono
        />
        <MarketStat
          label="USD Price"
          value={formatUsdPrice(market.usd)}
          numericValue={market.usd ?? undefined}
          formatFn={(n) => formatUsdPrice(n)}
          animated={animated}
        />
        <MarketStat
          label="Market Cap"
          value={formatUsdCompact(market.marketCap)}
          numericValue={market.marketCap ?? undefined}
          formatFn={(n) => formatUsdCompact(n)}
          animated={animated}
          className="col-span-2 sm:col-span-1"
        />
        {market.change24h != null ? (
          <MarketStat
            label="24h Change"
            value={formatPercentChange(market.change24h)}
            numericValue={market.change24h}
            formatFn={(n) => formatPercentChange(n)}
            animated={animated}
            valueClassName={changePositive ? "text-success" : "text-danger"}
          />
        ) : null}
        {market.volume24h != null ? (
          <MarketStat
            label="24h Volume"
            value={formatUsdCompact(market.volume24h)}
            numericValue={market.volume24h}
            formatFn={(n) => formatUsdCompact(n)}
            animated={animated}
          />
        ) : null}
      </div>

      {market.priceHistory24h.length > 1 ? (
        <div className="border-t border-border px-2 py-2">
          <LazyPriceSparkline data={market.priceHistory24h} ticker={config.ticker} />
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-fg-subtle">Market</h4>
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {market.source !== "unavailable" ? market.source : "price unavailable"}
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
            {market.source !== "unavailable" ? market.source : "price unavailable"}
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
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
  valueClassName?: string;
  animated?: boolean;
  numericValue?: number;
  formatFn?: (value: number) => string;
}) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-bold tabular-nums text-fg",
          mono && "font-mono text-base",
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
