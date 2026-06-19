'use client';

import { formatHeight } from '@/components/explorer/ExplorerUi';
import type { ChainMarket, ChainSummary, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import { formatHashrateKhPerMin, formatSupply } from '@/lib/formatMarket';
import { formatDifficulty } from '@/lib/utils';

export function InsightsKpiStrip({
  chainId,
  summary,
  network,
  market,
}: {
  chainId: 'vrm' | 'vrc';
  summary: ChainSummary;
  network: VrmNetworkStats | VrcNetworkStats;
  market: ChainMarket;
}) {
  const health = summary.health;
  const ticker = CHAIN_EXPLORERS[chainId].ticker;

  const tiles = [
    {
      label: 'Block height',
      value: formatHeight(
        network.blocks ?? health.heights.lastIndexedHeight ?? health.heights.maxIndexedHeight
      ),
    },
    {
      label: 'Addresses',
      value: formatHeight(health.counts.addressCount ?? 0),
    },
    {
      label: 'Supply',
      value: formatSupply(network.supply, ticker),
    },
    {
      label: 'Difficulty',
      value: network.difficulty != null ? formatDifficulty(String(network.difficulty)) : '—',
    },
    chainId === 'vrm'
      ? {
          label: 'Hashrate',
          value: formatHashrateKhPerMin((network as VrmNetworkStats).hashrateKhPerMin),
        }
      : {
          label: 'Interest',
          value:
            (network as VrcNetworkStats).interestRatePercent != null
              ? `${(network as VrcNetworkStats).interestRatePercent!.toFixed(2)}%`
              : '—',
        },
    {
      label: 'Price (USD)',
      value:
        market.usd != null
          ? `$${market.usd.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
          : '—',
    },
  ];

  return (
    <div className="insights-kpi-grid" role="region" aria-label="Key metrics">
      {tiles.map((tile) => (
        <div key={tile.label} className="insights-kpi-card">
          <p className="chain-metric-tile__label">{tile.label}</p>
          <p className="chain-metric-tile__value">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
