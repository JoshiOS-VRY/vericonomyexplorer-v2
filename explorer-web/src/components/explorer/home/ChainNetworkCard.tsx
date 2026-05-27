import { AnimatedStatValue } from "@/components/explorer/AnimatedStatValue";
import type { VrcNetworkStats, VrmNetworkStats } from "@/lib/api/types";
import { CHAIN_EXPLORERS } from "@/lib/chainDisplay";
import { formatHashrateKhPerMin, formatPercent, formatSupply } from "@/lib/formatMarket";
import { formatDifficulty, formatNumber } from "@/lib/utils";

interface ChainNetworkCardProps {
  chainId: "vrm" | "vrc";
  network: VrmNetworkStats | VrcNetworkStats;
  embedded?: boolean;
  animated?: boolean;
}

export function ChainNetworkCard({
  chainId,
  network,
  embedded = false,
  animated = false,
}: ChainNetworkCardProps) {
  const config = CHAIN_EXPLORERS[chainId];

  if (chainId === "vrm") {
    const vrm = network as VrmNetworkStats;
    const body = (
      <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-3 lg:divide-y-0">
        <NetworkStat
          label="Network Hash"
          value={formatHashrateKhPerMin(vrm.hashrateKhPerMin)}
          numericValue={vrm.hashrateKhPerMin ?? undefined}
          formatFn={(n) => formatHashrateKhPerMin(n)}
          animated={animated}
        />
        <NetworkStat
          label="Difficulty"
          value={vrm.difficulty != null ? formatDifficulty(String(vrm.difficulty)) : "—"}
          numericValue={vrm.difficulty ?? undefined}
          formatFn={(n) => formatDifficulty(String(n))}
          animated={animated}
        />
        <NetworkStat
          label={`${config.ticker} Supply`}
          value={formatSupply(vrm.supply, config.ticker)}
          numericValue={vrm.supply ?? undefined}
          formatFn={(n) => formatSupply(n, config.ticker)}
          animated={animated}
          className="col-span-2 lg:col-span-1"
        />
        {vrm.blocks != null ? (
          <NetworkStat
            label="Block Height"
            value={formatNumber(vrm.blocks)}
            numericValue={vrm.blocks}
            animated={animated}
          />
        ) : null}
        {vrm.hashrate7dKhPerMin != null ? (
          <NetworkStat
            label="7d Hash"
            value={formatHashrateKhPerMin(vrm.hashrate7dKhPerMin)}
            numericValue={vrm.hashrate7dKhPerMin}
            formatFn={(n) => formatHashrateKhPerMin(n)}
            animated={animated}
          />
        ) : null}
      </div>
    );

    if (embedded) {
      return (
        <div>
          <div className="border-b border-border px-4 py-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-fg-subtle">Network</h4>
          </div>
          {body}
        </div>
      );
    }

    return (
      <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-bold text-fg">{config.name} Network</h3>
        </div>
        {body}
      </section>
    );
  }

  const vrc = network as VrcNetworkStats;
  const body = (
    <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-3 lg:divide-y-0">
      <NetworkStat
        label="Interest Rate"
        value={formatPercent(vrc.interestRatePercent)}
        numericValue={vrc.interestRatePercent ?? undefined}
        formatFn={(n) => formatPercent(n)}
        animated={animated}
        hint="Annual PoST rate"
      />
      <NetworkStat
        label="Market Cap Supply"
        value={formatSupply(vrc.supply, config.ticker)}
        numericValue={vrc.supply ?? undefined}
        formatFn={(n) => formatSupply(n, config.ticker)}
        animated={animated}
      />
      <NetworkStat
        label="Staked"
        value={formatPercent(vrc.percentStaked)}
        numericValue={vrc.percentStaked ?? undefined}
        formatFn={(n) => formatPercent(n)}
        animated={animated}
        className="col-span-2 lg:col-span-1"
      />
      {vrc.netStakeWeight != null ? (
        <NetworkStat
          label="Net Stake Weight"
          value={formatNumber(vrc.netStakeWeight)}
          numericValue={vrc.netStakeWeight}
          animated={animated}
        />
      ) : null}
      {vrc.difficulty != null ? (
        <NetworkStat
          label="Difficulty"
          value={formatDifficulty(String(vrc.difficulty))}
          numericValue={vrc.difficulty}
          formatFn={(n) => formatDifficulty(String(n))}
          animated={animated}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div>
        <div className="border-b border-border px-4 py-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
            Network (PoST)
          </h4>
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-panel shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-bold text-fg">{config.name} Network (PoST)</h3>
      </div>
      {body}
    </section>
  );
}

function NetworkStat({
  label,
  value,
  hint,
  className,
  animated = false,
  numericValue,
  formatFn,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  animated?: boolean;
  numericValue?: number;
  formatFn?: (value: number) => string;
}) {
  return (
    <div className={className ? `${className} px-4 py-3` : "px-4 py-3"}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="mt-1 text-base font-bold tabular-nums text-fg">
        {animated ? (
          <AnimatedStatValue
            value={value}
            numericValue={numericValue}
            formatFn={formatFn}
          />
        ) : (
          value
        )}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-fg-subtle">{hint}</div> : null}
    </div>
  );
}
