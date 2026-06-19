import { LiveRelativeTime } from '@/components/explorer/LiveRelativeTime';
import { formatHeight } from '@/components/explorer/ExplorerUi';
import type { IndexedBlock, VrcNetworkStats, VrmNetworkStats } from '@/lib/api/types';
import type { ChainId } from '@/lib/chainDisplay';
import { formatPercent } from '@/lib/formatMarket';
import { formatDifficulty } from '@/lib/utils';

export function ChainMetricStrip({
  chainId,
  chainHeight,
  addressCount,
  tipBlock,
  heightPulse,
  network,
}: {
  chainId: ChainId;
  chainHeight: number | null;
  addressCount: number;
  tipBlock: IndexedBlock | undefined;
  heightPulse: boolean;
  network?: VrmNetworkStats | VrcNetworkStats | null;
}) {
  const tipDifficulty = tipBlock?.difficulty;
  const vrmNetwork = chainId === 'vrm' ? (network as VrmNetworkStats | null) : null;
  const vrcNetwork = chainId === 'vrc' ? (network as VrcNetworkStats | null) : null;
  const vrmDifficulty = tipDifficulty ?? vrmNetwork?.difficulty ?? null;

  const tiles = [
    {
      label: 'Block height',
      value: formatHeight(chainHeight),
      pulse: heightPulse,
    },
    {
      label: 'Addresses',
      value: formatHeight(addressCount),
    },
    {
      label: 'Latest block',
      value: tipBlock?.time ? (
        <LiveRelativeTime
          time={tipBlock.time}
          interval="second"
          className="truncate text-lg font-bold sm:text-xl"
        />
      ) : (
        '—'
      ),
    },
    chainId === 'vrc'
      ? {
          label: 'Interest rate',
          value: formatPercent(vrcNetwork?.interestRatePercent ?? tipBlock?.interestRatePercent),
        }
      : {
          label: 'Difficulty',
          value: vrmDifficulty != null ? formatDifficulty(vrmDifficulty) : '—',
        },
  ];

  return (
    <div className="chain-metric-strip" role="region" aria-label="Chain metrics">
      {tiles.map((tile) => (
        <div key={tile.label} className="chain-metric-tile">
          <p className="chain-metric-tile__label">{tile.label}</p>
          <p
            className={
              tile.pulse ? 'chain-metric-tile__value live-height-pulse' : 'chain-metric-tile__value'
            }
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
