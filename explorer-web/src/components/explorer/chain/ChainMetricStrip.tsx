import { LiveRelativeTime } from "@/components/explorer/LiveRelativeTime";
import { BcStat, BcStatGrid } from "@/components/explorer/BlockchairUi";
import { formatHeight } from "@/components/explorer/ExplorerUi";
import type {
  IndexedBlock,
  VrcNetworkStats,
  VrmNetworkStats,
} from "@/lib/api/types";
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
  network?: VrmNetworkStats | VrcNetworkStats | null;
}) {
  const tipDifficulty = tipBlock?.difficulty;
  const vrmNetwork = chainId === "vrm" ? (network as VrmNetworkStats | null) : null;
  const vrcNetwork = chainId === "vrc" ? (network as VrcNetworkStats | null) : null;
  const vrmDifficulty = tipDifficulty ?? vrmNetwork?.difficulty ?? null;

  return (
    <BcStatGrid className="grid-cols-4 sm:grid-cols-4">
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
          value={vrmDifficulty != null ? formatDifficulty(vrmDifficulty) : "—"}
        />
      )}
    </BcStatGrid>
  );
}
