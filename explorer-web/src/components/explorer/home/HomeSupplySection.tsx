'use client';

import { AnimatedStatValue } from '@/components/explorer/AnimatedStatValue';
import type { ChainMarket, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import { CHAIN_EXPLORERS, CHAIN_THEME } from '@/lib/chainDisplay';
import { formatHubSupply, formatPercent, formatUsdCompact } from '@/lib/formatMarket';

interface HomeSupplySectionProps {
  vrmNetwork: VrmNetworkStats;
  vrcNetwork: VrcNetworkStats;
  vrmMarket: ChainMarket;
  vrcMarket: ChainMarket;
}

function SupplyCard({
  chainId,
  network,
  market,
}: {
  chainId: 'vrm' | 'vrc';
  network: VrmNetworkStats | VrcNetworkStats;
  market: ChainMarket;
}) {
  const config = CHAIN_EXPLORERS[chainId];
  const theme = CHAIN_THEME[chainId];
  const supply = network.supply;
  const maxSupply = network.maxSupply;
  const pctOfMax =
    supply != null && maxSupply != null && maxSupply > 0 ? (supply / maxSupply) * 100 : null;

  const vrcNetwork = chainId === 'vrc' ? (network as VrcNetworkStats) : null;
  const stakedPct = vrcNetwork?.percentStaked ?? null;

  const legend = [
    {
      label: 'Circulating',
      value: formatHubSupply(supply, config.ticker),
      color: theme.accent,
    },
    ...(pctOfMax != null
      ? [{ label: 'Of max supply', value: formatPercent(pctOfMax), color: theme.accentSoft }]
      : []),
    ...(stakedPct != null
      ? [{ label: 'Staked', value: formatPercent(stakedPct), color: 'var(--success)' }]
      : []),
    { label: 'Market cap', value: formatUsdCompact(market.marketCap), color: 'var(--fg-muted)' },
  ];

  return (
    <article
      className="supply-card"
      style={{ '--supply-accent': theme.accent } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: theme.accent }}
          >
            {config.ticker} supply
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-fg">
            <AnimatedStatValue
              value={formatHubSupply(supply, config.ticker)}
              numericValue={supply ?? undefined}
              formatFn={(n) => formatHubSupply(n, config.ticker)}
            />
          </p>
          {maxSupply != null ? (
            <p className="mt-0.5 text-xs text-fg-subtle">
              Max {formatHubSupply(maxSupply, config.ticker)}
            </p>
          ) : null}
        </div>
        {pctOfMax != null ? (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
              Issued
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: theme.accent }}>
              {formatPercent(pctOfMax)}
            </p>
          </div>
        ) : null}
      </div>

      {pctOfMax != null ? (
        <div
          className="supply-card__bar"
          role="progressbar"
          aria-valuenow={pctOfMax}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="supply-card__fill" style={{ width: `${Math.min(100, pctOfMax)}%` }} />
        </div>
      ) : null}

      {chainId === 'vrc' && stakedPct != null ? (
        <div className="mt-2">
          <div
            className="supply-card__bar"
            role="progressbar"
            aria-valuenow={stakedPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="supply-card__fill"
              style={{
                width: `${Math.min(100, stakedPct)}%`,
                background:
                  'linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 50%, transparent))',
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="supply-card__legend">
        {legend.map((item) => (
          <span key={item.label} className="supply-card__legend-item">
            <span
              className="supply-card__dot"
              style={{ '--dot-color': item.color } as React.CSSProperties}
            />
            <span>{item.label}</span>
            <strong className="text-fg">{item.value}</strong>
          </span>
        ))}
      </div>
    </article>
  );
}

export function HomeSupplySection({
  vrmNetwork,
  vrcNetwork,
  vrmMarket,
  vrcMarket,
}: HomeSupplySectionProps) {
  return (
    <section aria-labelledby="supply-section-heading">
      <h2 id="supply-section-heading" className="home-dashboard__section-title">
        Supply metrics
      </h2>
      <div className="supply-section mt-4">
        <SupplyCard chainId="vrm" network={vrmNetwork} market={vrmMarket} />
        <SupplyCard chainId="vrc" network={vrcNetwork} market={vrcMarket} />
      </div>
    </section>
  );
}
