import { BcPanel } from "@/components/explorer/BlockchairUi";
import { RankList, formatHeight } from "@/components/explorer/ExplorerUi";
import { ChainPanelLink } from "@/components/explorer/chain/ChainPanelLink";
import type { LeaderboardResult } from "@/lib/api/types";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { VrmAddressLabel } from "@/components/explorer/address/VrmAddressLink";

export function VrmLeaderboardPreview({ leaderboard }: { leaderboard: LeaderboardResult }) {
  return (
    <BcPanel
      title="Activity"
      action={
        <ChainPanelLink
          href="/vrm/leaderboard?period=month&sort=activity"
          label="Leaderboard"
        />
      }
    >
      {!leaderboard.enabled && leaderboard.message ? (
        <p className="text-sm text-fg-muted">
          {formatExplorerUserMessage(leaderboard.message)}
        </p>
      ) : leaderboard.items.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {leaderboard.backfillRequired
            ? "Transfer activity is still being collected."
            : "No activity rankings yet."}
        </p>
      ) : (
        <RankList
          items={leaderboard.items.map((item) => ({
            href: `/vrm/address/${item.address}`,
            rank: item.rank,
            label: <VrmAddressLabel address={item.address} maxLength={18} />,
            value: `${formatHeight(item.txCount)} tx`,
          }))}
        />
      )}
    </BcPanel>
  );
}
