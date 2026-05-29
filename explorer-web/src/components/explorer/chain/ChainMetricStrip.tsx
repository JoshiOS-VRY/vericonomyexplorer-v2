import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcStat, BcStatGrid } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type { IndexedBlock, VrcNetworkStats } from "@/lib/api/types";
import type { ChainId } from "@/lib/chainDisplay";
import { formatPercent } from "@/lib/formatMarket";
import { formatDifficulty } from "@/lib/utils";

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
  network?: VrcNetworkStats | null;
}) {
  const tipDifficulty = tipBlock?.difficulty;
  const vrcNetwork = chainId === "vrc" ? network : null;

  return (
    <BcStatGrid>
      <BcStat
        label="Block height"
        value={formatHeight(chainHeight)}
        pulse={heightPulse}
      />
      <BcStat label="Addresses" value={formatHeight(addressCount)} />
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
      {chainId === "vrc" ? (
        <BcStat
          label="Interest rate"
          value={formatPercent(
            vrcNetwork?.interestRatePercent ?? tipBlock?.interestRatePercent,
          )}
        />
      ) : (
        <BcStat
          label="Difficulty"
          value={tipDifficulty ? formatDifficulty(tipDifficulty) : "—"}
        />
      )}
    </BcStatGrid>
  );
}
