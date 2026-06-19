'use client';

import { AnimatedStatValue } from '@/components/explorer/AnimatedStatValue';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import type { ChainMarket, ChainSummary, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import {
  formatAvgBlockTimeMin,
  formatHashrateKhPerMin,
  formatHubSupply,
  formatPercent,
  formatUsdPrice,
} from '@/lib/formatMarket';

interface HomePulseStripProps {
  vrmSummary: ChainSummary;
  vrcSummary: ChainSummary;
  vrmHeight: number | null;
  vrcHeight: number | null;
  vrmHeightPulse: boolean;
  vrcHeightPulse: boolean;
  vrmMarket: ChainMarket;
  vrcMarket: ChainMarket;
  vrmNetwork: VrmNetworkStats;
  vrcNetwork: VrcNetworkStats;
}

export function HomePulseStrip({
  vrmSummary,
  vrcSummary,
  vrmHeight,
  vrcHeight,
  vrmHeightPulse,
  vrcHeightPulse,
  vrmMarket,
  vrcMarket,
  vrmNetwork,
  vrcNetwork,
}: HomePulseStripProps) {
  const vrm = CHAIN_EXPLORERS.vrm;
  const vrc = CHAIN_EXPLORERS.vrc;

  const metrics = [
    {
      chain: 'vrm' as const,
      label: `${vrm.ticker} height`,
      value: formatHeight(vrmHeight),
      numericValue: vrmHeight ?? undefined,
      pulse: vrmHeightPulse,
    },
    {
      chain: 'vrc' as const,
      label: `${vrc.ticker} height`,
      value: formatHeight(vrcHeight),
      numericValue: vrcHeight ?? undefined,
      pulse: vrcHeightPulse,
    },
    {
      chain: 'vrm' as const,
      label: 'Hashrate',
      value: formatHashrateKhPerMin(vrmNetwork.hashrateKhPerMin),
      numericValue: vrmNetwork.hashrateKhPerMin ?? undefined,
      formatFn: (n: number) => formatHashrateKhPerMin(n),
    },
    {
      chain: 'vrc' as const,
      label: 'Staked',
      value: formatPercent(vrcNetwork.percentStaked),
      numericValue: vrcNetwork.percentStaked ?? undefined,
      formatFn: (n: number) => formatPercent(n),
    },
    {
      chain: 'vrm' as const,
      label: `${vrm.ticker} supply`,
      value: formatHubSupply(vrmNetwork.supply, vrm.ticker),
      numericValue: vrmNetwork.supply ?? undefined,
      formatFn: (n: number) => formatHubSupply(n, vrm.ticker),
    },
    {
      chain: 'vrc' as const,
      label: 'Interest',
      value: formatPercent(vrcNetwork.interestRatePercent),
      numericValue: vrcNetwork.interestRatePercent ?? undefined,
      formatFn: (n: number) => formatPercent(n),
    },
    {
      chain: 'vrm' as const,
      label: `${vrm.ticker} USD`,
      value: formatUsdPrice(vrmMarket.usd),
      numericValue: vrmMarket.usd ?? undefined,
      formatFn: (n: number) => formatUsdPrice(n),
    },
    {
      chain: 'vrc' as const,
      label: `${vrc.ticker} USD`,
      value: formatUsdPrice(vrcMarket.usd),
      numericValue: vrcMarket.usd ?? undefined,
      formatFn: (n: number) => formatUsdPrice(n),
    },
    {
      chain: 'vrm' as const,
      label: `${vrm.ticker} addresses`,
      value: formatHeight(vrmSummary.health.counts.addressCount),
      numericValue: vrmSummary.health.counts.addressCount,
    },
    {
      chain: 'vrc' as const,
      label: `${vrc.ticker} addresses`,
      value: formatHeight(vrcSummary.health.counts.addressCount),
      numericValue: vrcSummary.health.counts.addressCount,
    },
    {
      chain: 'vrm' as const,
      label: 'Avg block',
      value: formatAvgBlockTimeMin(vrmNetwork.avgBlockTimeMin),
      numericValue: vrmNetwork.avgBlockTimeMin ?? undefined,
      formatFn: (n: number) => formatAvgBlockTimeMin(n),
    },
  ];

  return (
    <div className="home-pulse" role="region" aria-label="Network pulse">
      <div className="home-pulse__track">
        {metrics.map((metric) => (
          <div
            key={`${metric.chain}-${metric.label}`}
            className={`home-pulse__cell home-pulse__cell--${metric.chain}`}
          >
            <span className="home-pulse__label">{metric.label}</span>
            <span className="home-pulse__value">
              <AnimatedStatValue
                value={metric.value}
                numericValue={metric.numericValue}
                formatFn={metric.formatFn}
                pulse={metric.pulse}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
