import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcStat, BcStatGrid } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { ChainHealth, IndexedBlock } from "@/lib/api/types";
import { formatBlocksBehind } from "@/lib/chainDisplay";
import { formatDifficulty, formatNumber } from "@/lib/utils";

export function VrmMetricStrip({
  chainHeight,
  addressCount,
  health,
  tipBlock,
  heightPulse,
}: {
  chainHeight: number | null;
  addressCount: number;
  health: ChainHealth;
  tipBlock: IndexedBlock | undefined;
  heightPulse: boolean;
}) {
  const tipDifficulty = tipBlock?.difficulty;

  return (
    <BcStatGrid>
      <BcStat
        label="Block height"
        value={formatHeight(chainHeight)}
        pulse={heightPulse}
      />
      <BcStat label="Addresses" value={formatHeight(addressCount)} />
      <BcStat label="Sync" value={formatBlocksBehind(health)} />
      <BcStat
        label="Indexed blocks"
        value={formatNumber(health.counts.indexedBlockCount)}
      />
      <BcStat
        label="Latest block"
        value={
          tipBlock?.time ? (
            <LiveRelativeTime
              time={tipBlock.time}
              interval="second"
              className="text-lg font-bold sm:text-xl truncate"
            />
          ) : (
            "—"
          )
        }
      />
      <BcStat
        label="Difficulty"
        value={tipDifficulty ? formatDifficulty(tipDifficulty) : "—"}
      />
    </BcStatGrid>
  );
}
